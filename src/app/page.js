'use client'

import { supabase } from "../lib/supabase" 
import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import ClientsTable from "../components/ClientsTable"
import SummaryCards from "../components/SummaryCards"
import AddClientPanel from "../components/AddClientPanel"

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

  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)
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
    const quarters = { 1: "Δ' Τρίμ", 4: "Α' Τρίμ", 7: "Β' Τρίμ", 10: "Γ' Τρίμ" };
    return quarters[month] ? { status: "due", label: quarters[month] } : { status: "ok", label: "ΑΝΑΜΟΝΗ" };
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
        setUser(authUser); fetchClients(authUser.id); fetchAllUnpaid(authUser.id);
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
      setName(""); setAfm(""); setFee(""); setIsAddPanelOpen(false);
      fetchClients(user.id); fetchAllUnpaid(user.id); 
    }
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

  // --- RENDER HELPERS ---
  if (loading || !user) return <div className="flex h-screen items-center justify-center bg-[#F9F7F2] font-black text-blue-600 tracking-widest animate-pulse uppercase italic">TaxTick HUB</div>

  const pendingVat = clients?.filter(c => getVatStatus(c).status === "due" && !c.vat_submitted) || [];
  const unpaidCurrent = clients?.filter(c => c.payment_status === "pending") || [];
  const overdueCount = clients?.filter(c => allUnpaid.some(u => u.afm === c.afm && u.month !== c.month)).length || 0;
  const currentIncome = clients?.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0) || 0;
  const totalOfficeDebt = allUnpaid.reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0);

  return (
    <div className="min-h-screen flex bg-[#F9F7F2] text-slate-900 font-sans antialiased">
      <Sidebar />
      <main className="flex-1 p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          <div className="flex justify-between items-end mb-10">
            <Header selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
            <button onClick={() => setIsAddPanelOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-3 uppercase text-[10px] tracking-widest">
              <span className="text-xl">+</span> Προσθήκη Πελάτη
            </button>
          </div>

          <SummaryCards 
            pendingVatCount={pendingVat.length}
            currentIncome={currentIncome}
            totalOfficeDebt={totalOfficeDebt}
            unpaidCount={unpaidCurrent.length}
            overdueCount={overdueCount}
          />

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest italic">Καρτέλα Πελατών</h3>
                <p className="text-[9px] text-gray-400 font-black uppercase mt-1 tracking-tighter">Ενεργοί Μήνα: {clients.length}</p>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => {
                    const ids = pendingVat.map(c => c.id);
                    if(ids.length > 0 && confirm(`Κλείσιμο ${ids.length} ΦΠΑ;`)) 
                      supabase.from("clients").update({ vat_submitted: true }).in("id", ids).then(() => fetchClients(user.id))
                 }} className="text-[9px] bg-white text-slate-600 px-5 py-2.5 rounded-xl font-black border border-gray-200 hover:bg-slate-50 transition uppercase shadow-sm">
                    ✅ ΜΑΖΙΚΟ ΦΠΑ
                 </button>
                 <button onClick={copyClientsToNextMonth} className="text-[9px] bg-white text-slate-600 px-5 py-2.5 rounded-xl font-black border border-gray-200 hover:bg-slate-50 transition uppercase shadow-sm">
                    📋 ΑΝΤΙΓΡΑΦΗ ΜΗΝΑ
                 </button>
              </div>
            </div>
            
            <div className="p-2">
              <ClientsTable
                clients={clients || []}
                allUnpaid={allUnpaid}
                togglePayment={(c) => {
                  const newS = c.payment_status === "paid" ? "pending" : "paid"
                  supabase.from("clients").update({ payment_status: newS }).eq("id", c.id).then(() => { fetchClients(user.id); fetchAllUnpaid(user.id); })
                }}
                toggleVatSubmitted={(c) => supabase.from("clients").update({ vat_submitted: !c.vat_submitted }).eq("id", c.id).then(() => fetchClients(user.id))}
                deleteClient={(id) => confirm("Διαγραφή;") && supabase.from("clients").delete().eq("id", id).then(() => { fetchClients(user.id); fetchAllUnpaid(user.id); })}
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

      <AddClientPanel 
        isOpen={isAddPanelOpen} onClose={() => setIsAddPanelOpen(false)} onAdd={addClient}
        name={name} setName={setName} afm={afm} setAfm={setAfm} fee={fee} setFee={setFee} vatType={vatType} setVatType={setVatType}
      />

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-lg border border-gray-100">
             <div className="flex justify-between items-center mb-10">
               <h2 className="text-xl font-black text-slate-900 uppercase italic underline decoration-blue-600">Επεξεργασία</h2>
               <button onClick={() => setIsEditModalOpen(false)} className="text-gray-300 hover:text-slate-900 font-black text-2xl">×</button>
             </div>
             <div className="space-y-6">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-gray-100 p-4 rounded-2xl font-bold bg-gray-50 outline-none focus:bg-white focus:border-blue-500 transition-all text-slate-900" placeholder="Ονοματεπώνυμο" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)} className="w-full border border-gray-100 p-4 rounded-2xl font-bold bg-gray-50 outline-none text-slate-900" placeholder="Αμοιβή" />
                  <select value={editVatType} onChange={e => setEditVatType(e.target.value)} className="w-full border border-gray-100 p-4 rounded-2xl font-bold bg-gray-50 outline-none text-slate-900">
                    <option value="monthly">ΜΗΝΙΑΙΟ</option> <option value="quarterly">ΤΡΙΜΗΝΙΑΙΟ</option> <option value="none">ΧΩΡΙΣ ΦΠΑ</option>
                  </select>
                </div>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full border border-gray-100 p-4 rounded-2xl h-32 text-sm font-medium bg-gray-50 outline-none text-slate-900" placeholder="Σημειώσεις (π.χ. εκκρεμεί τιμολόγιο)..." />
             </div>
             <div className="mt-10 flex gap-4">
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px] tracking-widest">Ακύρωση</button>
                <button onClick={async () => {
                   const isVatE = editVatType !== "none"
                   await supabase.from("clients").update({ name: editName, monthly_fee: Number(editFee), vat_enabled: isVatE, vat_type: isVatE ? editVatType : "monthly", notes: editNotes }).eq("id", editingClient.id)
                   setIsEditModalOpen(false); fetchClients(user.id); fetchAllUnpaid(user.id);
                }} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Αποθήκευση</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
