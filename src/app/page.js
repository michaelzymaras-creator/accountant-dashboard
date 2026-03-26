'use client'

import { supabase } from "../lib/supabase" 
import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import ClientsTable from "../components/ClientsTable"

export default function Home() {
  const router = useRouter()
  
  const [name, setName] = useState("")
  const [afm, setAfm] = useState("")
  const [fee, setFee] = useState("")
  const [vatType, setVatType] = useState("monthly")
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [clients, setClients] = useState([])
  const [allUnpaid, setAllUnpaid] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [editName, setEditName] = useState("")
  const [editFee, setEditFee] = useState("")
  const [editVatType, setEditVatType] = useState("monthly")
  const [editNotes, setEditNotes] = useState("")

  const getVatStatus = useCallback((client) => {
    if (!client?.vat_enabled || client?.vat_type === "none") return { status: "none", label: "-" };
    const month = parseInt(selectedMonth.split("-"));
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
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId)
      .eq("month", selectedMonth)
      .order("created_at", { ascending: false })
    if (data) setClients(data)
  }, [selectedMonth])

  const fetchAllUnpaid = useCallback(async (userId) => {
    if (!userId) return
    const { data } = await supabase
      .from("clients")
      .select("afm, monthly_fee, month")
      .eq("user_id", userId)
      .eq("payment_status", "pending")
    if (data) setAllUnpaid(data)
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)
        fetchClients(authUser.id)
        fetchAllUnpaid(authUser.id)
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    initAuth()
  }, [fetchClients, fetchAllUnpaid, router])

  async function bulkMarkVatSubmitted(pendingIds) {
    if (!user?.id || !pendingIds.length) return
    if (!confirm(`Σήμανση ${pendingIds.length} υποβολών;`)) return
    await supabase.from("clients").update({ vat_submitted: true }).in("id", pendingIds)
    fetchClients(user.id)
  }

  async function addClient() {
    if (!user?.id) return
    const isVatEnabled = vatType !== "none"
    await supabase.from("clients").insert([{
      user_id: user.id, name, afm, monthly_fee: Number(fee) || 0,
      payment_status: "pending", month: selectedMonth,
      vat_enabled: isVatEnabled, vat_type: isVatEnabled ? vatType : "monthly",
      vat_submitted: false
    }])
    setName(""); setAfm(""); setFee(""); fetchClients(user.id); fetchAllUnpaid(user.id);
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

  async function togglePayment(client) {
    if (!user?.id) return
    const newStatus = client.payment_status === "paid" ? "pending" : "paid"
    await supabase.from("clients").update({ payment_status: newStatus }).eq("id", client.id)
    fetchClients(user.id); fetchAllUnpaid(user.id);
  }

  async function toggleVatSubmitted(client) {
    if (!user?.id) return
    await supabase.from("clients").update({ vat_submitted: !client.vat_submitted }).eq("id", client.id)
    fetchClients(user.id)
  }

  async function updateClient() {
    if (!editingClient || !user?.id) return
    const isVatEnabled = editVatType !== "none"
    await supabase.from("clients").update({ 
      name: editName, monthly_fee: Number(editFee), vat_enabled: isVatEnabled, 
      vat_type: isVatEnabled ? editVatType : "monthly", notes: editNotes 
    }).eq("id", editingClient.id)
    setIsEditModalOpen(false); fetchClients(user.id); fetchAllUnpaid(user.id);
  }

  async function deleteClient(id) {
    if (!user?.id || !confirm("Διαγραφή;")) return
    await supabase.from("clients").delete().eq("id", id)
    fetchClients(user.id); fetchAllUnpaid(user.id);
  }

  function openEditModal(client) {
    setEditingClient(client); setEditName(client?.name || ""); setEditFee(client?.monthly_fee || "");
    setEditVatType(!client?.vat_enabled ? "none" : client?.vat_type || "monthly");
    setEditNotes(client?.notes || ""); setIsEditModalOpen(true);
  }

  if (loading || !user) return <div className="flex h-screen items-center justify-center bg-[#F9F7F2] font-black uppercase">ΦΟΡΤΩΣΗ...</div>

  // Υπολογισμοί
  const pendingVat = clients?.filter(c => getVatStatus(c).status === "due" && !c.vat_submitted) || [];
  const unpaidCurrent = clients?.filter(c => c.payment_status === "pending") || [];
  const overdueClientsCount = clients?.filter(c => allUnpaid.some(u => u.afm === c.afm && u.month !== c.month)).length || 0;
  const currentIncome = clients?.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0) || 0;
  const totalOfficeDebt = allUnpaid.reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0);

  return (
    <div className="min-h-screen flex bg-[#F9F7F2] text-slate-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Header selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />

          {/* ΤΟ ΝΕΟ DASHBOARD - ΜΟΝΟ 3 ΚΑΘΑΡΕΣ ΚΑΡΤΕΣ */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-orange-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>
               <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">ΦΠΑ Προς Υποβολή</p>
               <h4 className="text-3xl font-black text-slate-900">{pendingVat.length}</h4>
            </div>
            
            <div className="bg-white border border-blue-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
               <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Είσπραξη Μήνα / Παλιά Χρέη</p>
               <h4 className="text-3xl font-black text-slate-900">{currentIncome} € <span className="text-sm text-red-500">/ {totalOfficeDebt} €</span></h4>
            </div>

            <div className="bg-white border border-red-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-2 h-full bg-red-600"></div>
               <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">Εκκρεμείς Πληρωμές</p>
               <h4 className="text-3xl font-black text-slate-900">{unpaidCurrent.length} <span className="text-sm text-gray-400">({overdueClientsCount} με παλιά)</span></h4>
            </div>
          </div>

          {/* ΦΟΡΜΑ ΚΑΙ ΠΙΝΑΚΑΣ */}
          <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-slate-900 uppercase text-lg">Πελατολόγιο ({selectedMonth})</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Σύνολο Πελατών: {clients.length}</p>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => bulkMarkVatSubmitted(pendingVat.map(c => c.id))} className="text-[10px] bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-black hover:bg-blue-100 transition border border-blue-100">
                    ✅ ΜΑΖΙΚΟ ΦΠΑ
                 </button>
                 <button onClick={copyClientsToNextMonth} className="text-[10px] bg-green-50 text-green-700 px-4 py-2 rounded-xl font-black hover:bg-green-100 transition border border-green-100">
                    📋 ΑΝΤΙΓΡΑΦΗ ΜΗΝΑ
                 </button>
              </div>
            </div>
            
            <div className="flex gap-2 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <input placeholder="Όνομα" value={name} onChange={e => setName(e.target.value)} className="bg-white border border-gray-200 p-2 rounded-lg flex-1 outline-none font-bold text-sm" />
              <input placeholder="ΑΦΜ" value={afm} onChange={e => setAfm(e.target.value)} className="bg-white border border-gray-200 p-2 rounded-lg flex-1 outline-none font-bold text-sm" />
              <input placeholder="Αμοιβή" type="number" value={fee} onChange={e => setFee(e.target.value)} className="bg-white border border-gray-200 p-2 rounded-lg w-24 outline-none font-bold text-sm" />
              <select value={vatType} onChange={e => setVatType(e.target.value)} className="bg-white border border-gray-200 p-2 rounded-lg text-xs font-black outline-none">
                <option value="monthly">ΜΗΝΙΑΙΟ</option> <option value="quarterly">ΤΡΙΜΗΝΙΑΙΟ</option> <option value="none">ΧΩΡΙΣ ΦΠΑ</option>
              </select>
              <button onClick={addClient} className="bg-blue-600 text-white px-8 rounded-lg font-black uppercase text-[10px] hover:shadow-lg transition">Προσθήκη</button>
            </div>

            <ClientsTable
              clients={clients || []}
              allUnpaid={allUnpaid}
              togglePayment={togglePayment}
              toggleVatSubmitted={toggleVatSubmitted}
              deleteClient={deleteClient}
              setEditingClient={openEditModal}
              getVatStatus={getVatStatus}
            />
          </div>
        </div>
      </main>

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
            <h2 className="text-xl font-black mb-6 border-b pb-4 uppercase text-slate-900 tracking-tighter">Επεξεργασία Πελάτη</h2>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ονοματεπώνυμο</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl font-bold text-slate-900 mt-1 focus:border-blue-500 outline-none transition" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Αμοιβή (€)</label>
                    <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl font-bold text-slate-900 mt-1 focus:border-blue-500 outline-none transition" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ΦΠΑ</label>
                    <select value={editVatType} onChange={e => setEditVatType(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl font-bold text-slate-900 mt-1 focus:border-blue-500 outline-none transition">
                        <option value="monthly">ΜΗΝΙΑΙΟ</option> <option value="quarterly">ΤΡΙΜΗΝΙΑΙΟ</option> <option value="none">ΧΩΡΙΣ ΦΠΑ</option>
                    </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Σημειώσεις</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl h-28 text-sm font-medium text-slate-900 mt-1 focus:border-blue-500 outline-none transition" placeholder="..." />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-gray-400 font-black uppercase text-[10px] hover:text-gray-600 transition">Ακύρωση</button>
              <button onClick={updateClient} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] shadow-md hover:bg-blue-700 transition">Αποθήκευση</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
