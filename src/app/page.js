'use client'

import { supabase } from "../lib/supabase" 
import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import ClientsTable from "../components/ClientsTable"

export default function Home() {
  const router = useRouter()
  
  // --- STATES ---
  const [name, setName] = useState("")
  const [afm, setAfm] = useState("")
  const [fee, setFee] = useState("")
  const [vatType, setVatType] = useState("monthly")
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [clients, setClients] = useState([])
  const [allUnpaid, setAllUnpaid] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modals / Panels
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false) // Για τη νέα φόρμα
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [editName, setEditName] = useState("")
  const [editFee, setEditFee] = useState("")
  const [editVatType, setEditVatType] = useState("monthly")
  const [editNotes, setEditNotes] = useState("")

  // --- LOGIC ---
  const getVatStatus = useCallback((client) => {
    if (!client?.vat_enabled || client?.vat_type === "none") return { status: "none", label: "-" };
    const month = parseInt(selectedMonth.split("-")[1]);
    const monthsGr = ["", "Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαϊ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];
    if (client.vat_type === "monthly") {
      const prevMonth = month === 1 ? 12 : month - 1;
      return { status: "due", label: `ΦΠΑ ${monthsGr[prevMonth]}` };
    }
    if (client.vat_type === "quarterly") {
      const quarters = { 1: "Δ' Τρίμ", 4: "Α' Τρίμ", 7: "Β' Τρίμ", 10: "Γ' Τρίμ" };
      return quarters[month] ? { status: "due", label: quarters[month] } : { status: "ok", label: "Αναμονή" };
    }
    return { status: "ok", label: "-" };
  }, [selectedMonth]);

  const fetchClients = useCallback(async (userId) => {
    if (!userId) return 
    const { data } = await supabase.from("clients").select("*").eq("user_id", userId).eq("month", selectedMonth).order("created_at", { ascending: false })
    if (data) setClients(data)
  }, [selectedMonth])

  const fetchAllUnpaid = useCallback(async (userId) => {
    if (!userId) return
    const { data } = await supabase.from("clients").select("afm, monthly_fee, month").eq("user_id", userId).eq("payment_status", "pending")
    if (data) setAllUnpaid(data)
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)
        fetchClients(authUser.id); fetchAllUnpaid(authUser.id);
      } else { router.push('/login') }
      setLoading(false)
    }
    initAuth()
  }, [fetchClients, fetchAllUnpaid, router])

  // --- ACTIONS ---
  async function addClient() {
    if (!user?.id) return
    const isVatEnabled = vatType !== "none"
    const { error } = await supabase.from("clients").insert([{
      user_id: user.id, name, afm, monthly_fee: Number(fee) || 0,
      payment_status: "pending", month: selectedMonth,
      vat_enabled: isVatEnabled, vat_type: isVatEnabled ? vatType : "monthly", vat_submitted: false
    }])
    if (!error) { 
      setName(""); setAfm(""); setFee(""); 
      setIsAddPanelOpen(false); // Κλείσε το πάνελ
      fetchClients(user.id); fetchAllUnpaid(user.id); 
    }
  }

  async function bulkMarkVatSubmitted(pendingIds) {
    if (!user?.id || !pendingIds.length) return
    if (!confirm(`Σήμανση ${pendingIds.length} υποβολών;`)) return
    await supabase.from("clients").update({ vat_submitted: true }).in("id", pendingIds)
    fetchClients(user.id)
  }

  async function copyClientsToNextMonth() {
    if (!user?.id || !clients?.length) return
    let [year, month] = selectedMonth.split('-').map(Number)
    month++; if (month > 12) { month = 1; year++; }
    const nextMonthStr = `${year}-${String(month).padStart(2, '0')}`
    if (!confirm(`Αντιγραφή στον ${nextMonthStr};`)) return
    const newRecords = clients.map(c => ({
      user_id: user.id, name: c.name, afm: c.afm, monthly_fee: c.monthly_fee,
      payment_status: "pending", month: nextMonthStr,
      vat_enabled: c.vat_enabled, vat_type: c.vat_type, vat_submitted: false, notes: c.notes
    }))
    await supabase.from("clients").insert(newRecords)
    setSelectedMonth(nextMonthStr); fetchAllUnpaid(user.id);
  }

  // --- UI HELPERS ---
  if (loading || !user) return <div className="flex h-screen items-center justify-center bg-[#F9F7F2] font-black uppercase tracking-widest text-blue-600">TaxTick Loading...</div>

  const pendingVat = clients?.filter(c => getVatStatus(c).status === "due" && !c.vat_submitted) || [];
  const unpaidCurrent = clients?.filter(c => c.payment_status === "pending") || [];
  const overdueClientsCount = clients?.filter(c => allUnpaid.some(u => u.afm === c.afm && u.month !== c.month)).length || 0;
  const currentIncome = clients?.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0) || 0;
  const totalOfficeDebt = allUnpaid.reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0);

  return (
    <div className="min-h-screen flex bg-[#F9F7F2] text-slate-900 font-sans antialiased">
      <Sidebar />
      
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex justify-between items-end mb-10">
            <Header selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
            <button 
              onClick={() => setIsAddPanelOpen(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 uppercase text-xs tracking-wider"
            >
              <span className="text-xl">+</span> Νέος Πελάτης
            </button>
          </div>

          {/* DASHBOARD CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 relative">
               <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Εκκρεμεί ΦΠΑ</p>
               <h4 className="text-4xl font-black text-orange-600">{pendingVat.length}</h4>
               <div className="absolute top-6 right-6 text-orange-200 text-3xl">⚠️</div>
            </div>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 relative">
               <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Είσπραξη / Οφειλές</p>
               <h4 className="text-4xl font-black text-slate-900">{currentIncome}€ <span className="text-sm text-red-500 font-bold ml-1">/ {totalOfficeDebt}€</span></h4>
               <div className="absolute top-6 right-6 text-blue-100 text-3xl">💰</div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 relative">
               <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Εκκρεμείς Πληρωμές</p>
               <h4 className="text-4xl font-black text-red-600">{unpaidCurrent.length}</h4>
               <div className="absolute top-6 right-6 text-red-100 text-3xl">🚨</div>
            </div>
          </div>

          {/* TABLE SECTION */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 uppercase text-sm tracking-tight">Πελατολόγιο Μήνα</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Σύνολο: {clients.length} εγγραφές</p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => bulkMarkVatSubmitted(pendingVat.map(c => c.id))} className="text-[10px] bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl font-black border border-gray-100 hover:bg-slate-100 transition uppercase tracking-tighter">
                    ✅ Μαζικό ΦΠΑ
                 </button>
                 <button onClick={copyClientsToNextMonth} className="text-[10px] bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl font-black border border-gray-100 hover:bg-slate-100 transition uppercase tracking-tighter">
                    📋 Αντιγραφή
                 </button>
              </div>
            </div>
            
            <div className="p-2">
              <ClientsTable
                clients={clients || []}
                allUnpaid={allUnpaid}
                togglePayment={(c) => {
                  const newStatus = c.payment_status === "paid" ? "pending" : "paid"
                  supabase.from("clients").update({ payment_status: newStatus }).eq("id", c.id).then(() => {
                    fetchClients(user.id); fetchAllUnpaid(user.id);
                  })
                }}
                toggleVatSubmitted={(c) => {
                  supabase.from("clients").update({ vat_submitted: !c.vat_submitted }).eq("id", c.id).then(() => fetchClients(user.id))
                }}
                deleteClient={(id) => {
                  if(confirm("Διαγραφή;")) supabase.from("clients").delete().eq("id", id).then(() => { fetchClients(user.id); fetchAllUnpaid(user.id); })
                }}
                setEditingClient={(c) => {
                  setEditingClient(c); setEditName(c.name); setEditFee(c.monthly_fee);
                  setEditVatType(!c.vat_enabled ? "none" : c.vat_type); setEditNotes(c.notes);
                  setIsEditModalOpen(true);
                }}
                getVatStatus={getVatStatus}
              />
            </div>
          </div>
        </div>
      </main>

      {/* --- SLIDE-OVER PANEL (NEW ADD FORM) --- */}
      {isAddPanelOpen && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={() => setIsAddPanelOpen(false)}></div>
          <div className="absolute inset-y-0 right-0 max-w-full flex">
            <div className="w-screen max-w-md bg-white shadow-2xl p-10 flex flex-col border-l border-gray-100">
              <div className="flex justify-between items-start mb-10">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Προσθήκη Πελάτη</h2>
                <button onClick={() => setIsAddPanelOpen(false)} className="text-gray-400 hover:text-slate-900 text-2xl font-black">×</button>
              </div>
              
              <div className="space-y-6 flex-1">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Όνομα Πελάτη</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="w-full border-b-2 border-gray-100 p-3 text-lg font-bold text-slate-900 outline-none focus:border-blue-600 transition-colors" placeholder="..." />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ΑΦΜ</label>
                  <input value={afm} onChange={e => setAfm(e.target.value)} className="w-full border-b-2 border-gray-100 p-3 text-lg font-bold text-slate-900 outline-none focus:border-blue-600 transition-colors" placeholder="000000000" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Αμοιβή (€)</label>
                    <input type="number" value={fee} onChange={e => setFee(e.target.value)} className="w-full border-b-2 border-gray-100 p-3 text-lg font-bold text-slate-900 outline-none focus:border-blue-600 transition-colors" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Τύπος ΦΠΑ</label>
                    <select value={vatType} onChange={e => setVatType(e.target.value)} className="w-full border-b-2 border-gray-100 p-3 text-sm font-black text-slate-900 outline-none focus:border-blue-600 transition-colors bg-white">
                      <option value="monthly">ΜΗΝΙΑΙΟ</option>
                      <option value="quarterly">ΤΡΙΜΗΝΙΑΙΟ</option>
                      <option value="none">ΧΩΡΙΣ ΦΠΑ</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-10">
                <button onClick={addClient} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all">
                  Δημιουργία Εγγραφής
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL (REMAINING AS MODAL) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[110]">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-lg border border-gray-100">
             {/* ... Edit Modal Content (Same as before but with better padding/rounded) ... */}
             <div className="flex justify-between items-center mb-8">
               <h2 className="text-xl font-black text-slate-900 uppercase">Επεξεργασία</h2>
               <button onClick={() => setIsEditModalOpen(false)} className="text-gray-300 hover:text-slate-900 font-black">ΚΛΕΙΣΙΜΟ</button>
             </div>
             <div className="space-y-6">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-gray-100 p-4 rounded-2xl font-bold bg-gray-50 outline-none focus:bg-white focus:border-blue-500 transition-all" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)} className="w-full border border-gray-100 p-4 rounded-2xl font-bold bg-gray-50 outline-none" />
                  <select value={editVatType} onChange={e => setEditVatType(e.target.value)} className="w-full border border-gray-100 p-4 rounded-2xl font-bold bg-gray-50 outline-none">
                    <option value="monthly">ΜΗΝΙΑΙΟ</option> <option value="quarterly">ΤΡΙΜΗΝΙΑΙΟ</option> <option value="none">ΧΩΡΙΣ ΦΠΑ</option>
                  </select>
                </div>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full border border-gray-100 p-4 rounded-2xl h-32 text-sm font-medium bg-gray-50 outline-none" placeholder="Σημειώσεις..." />
             </div>
             <div className="mt-10 flex gap-3">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px]">Ακύρωση</button>
                <button onClick={async () => {
                   const isVatEnabled = editVatType !== "none"
                   await supabase.from("clients").update({ 
                     name: editName, monthly_fee: Number(editFee), vat_enabled: isVatEnabled, 
                     vat_type: isVatEnabled ? editVatType : "monthly", notes: editNotes 
                   }).eq("id", editingClient.id)
                   setIsEditModalOpen(false); fetchClients(user.id); fetchAllUnpaid(user.id);
                }} className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Αποθήκευση</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
