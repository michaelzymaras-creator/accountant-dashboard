'use client'

import { supabase } from "../lib/supabase" 
import { useState, useEffect, useCallback } from "react"
import { useRouter } from 'next/navigation'

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import StatsCards from "../components/StatsCards"
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

  // --- 1. ΛΟΓΙΚΗ ΦΠΑ (Ποιος μήνας υποβάλλεται) ---
  const getVatStatus = (client) => {
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
  };

  // --- 2. FETCH DATA ---
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

  // --- 3. ΥΠΟΛΟΓΙΣΜΟΙ ΓΙΑ DASHBOARD (Νο. 1) ---
  const pendingVat = clients?.filter(c => getVatStatus(c).status === "due" && !c.vat_submitted);
  const unpaidCurrent = clients?.filter(c => c.payment_status === "pending");
  const overdueClientsCount = clients?.filter(c => {
    return allUnpaid.some(u => u.afm === c.afm && u.month !== c.month);
  }).length;

  // --- 4. ΜΑΖΙΚΟ ΦΠΑ (Νο. 3) ---
  async function bulkMarkVatSubmitted() {
    if (pendingVat.length === 0) return alert("Δεν υπάρχουν εκκρεμή ΦΠΑ.");
    if (!confirm(`Σήμανση και των ${pendingVat.length} υποβολών ως ολοκληρωμένες;`)) return;

    const ids = pendingVat.map(c => c.id);
    const { error } = await supabase.from("clients").update({ vat_submitted: true }).in("id", ids);

    if (!error) {
      alert("Επιτυχής μαζική ενημέρωση!");
      fetchClients(user.id);
    }
  }

  // --- 5. ΛΟΙΠΕΣ ΣΥΝΑΡΤΗΣΕΙΣ ---
  async function addClient() {
    if (!user?.id) return
    const isVatEnabled = vatType !== "none"
    const { error } = await supabase.from("clients").insert([{
      user_id: user.id, name, afm, monthly_fee: Number(fee) || 0,
      payment_status: "pending", month: selectedMonth,
      vat_enabled: isVatEnabled, vat_type: isVatEnabled ? vatType : "monthly",
      vat_submitted: false, notes: ""
    }])
    if (!error) { setName(""); setAfm(""); setFee(""); fetchClients(user.id); fetchAllUnpaid(user.id); }
  }

  async function copyClientsToNextMonth() {
    if (!clients?.length || !user?.id) return alert("Δεν υπάρχουν πελάτες")
    let [year, month] = selectedMonth.split('-').map(Number)
    month++; if (month > 12) { month = 1; year++; }
    const nextMonthStr = `${year}-${String(month).padStart(2, '0')}`
    if (!confirm(`Αντιγραφή στον ${nextMonthStr};`)) return
    const newRecords = clients.map(c => ({
      user_id: user.id, name: c.name, afm: c.afm, monthly_fee: c.monthly_fee,
      payment_status: "pending", month: nextMonthStr,
      vat_enabled: c.vat_enabled, vat_type: c.vat_type, vat_submitted: false, notes: c.notes
    }))
    const { error } = await supabase.from("clients").insert(newRecords)
    if (!error) { alert("Η λίστα μεταφέρθηκε!"); setSelectedMonth(nextMonthStr); fetchAllUnpaid(user.id); }
  }

  async function togglePayment(client) {
    const newStatus = client.payment_status === "paid" ? "pending" : "paid"
    await supabase.from("clients").update({ payment_status: newStatus }).eq("id", client.id)
    fetchClients(user.id); fetchAllUnpaid(user.id);
  }

  async function toggleVatSubmitted(client) {
    await supabase.from("clients").update({ vat_submitted: !client.vat_submitted }).eq("id", client.id)
    fetchClients(user.id)
  }

  async function updateClient() {
    if (!editingClient || !user?.id) return
    const isVatEnabled = editVatType !== "none"
    const { error } = await supabase.from("clients").update({ 
      name: editName, monthly_fee: Number(editFee), vat_enabled: isVatEnabled, 
      vat_type: isVatEnabled ? editVatType : "monthly", notes: editNotes 
    }).eq("id", editingClient.id)
    if (!error) { setIsEditModalOpen(false); fetchClients(user.id); fetchAllUnpaid(user.id); }
  }

  async function deleteClient(id) {
    if (confirm("Διαγραφή;")) {
      await supabase.from("clients").delete().eq("id", id)
      fetchClients(user.id); fetchAllUnpaid(user.id);
    }
  }

  function openEditModal(client) {
    setEditingClient(client); setEditName(client?.name || ""); setEditFee(client?.monthly_fee || "");
    setEditVatType(!client?.vat_enabled ? "none" : client?.vat_type || "monthly");
    setEditNotes(client?.notes || ""); setIsEditModalOpen(true);
  }

  if (loading || !user) return <div className="flex h-screen items-center justify-center bg-[#F9F7F2] text-slate-900 font-bold tracking-widest">ΦΟΡΤΩΣΗ...</div>

  return (
    <div className="min-h-screen flex bg-[#F9F7F2] text-slate-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Header selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />

          {/* --- DASHBOARD ΠΡΟΘΕΣΜΙΩΝ (Νο. 1) --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-xl shadow-sm">
              <p className="text-orange-700 text-[10px] font-black uppercase">Εκκρεμεί ΦΠΑ</p>
              <h4 className="text-2xl font-black text-orange-900">{pendingVat.length} <span className="text-sm">Υποβολές</span></h4>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl shadow-sm">
              <p className="text-blue-700 text-[10px] font-black uppercase">Απλήρωτοι Μήνα</p>
              <h4 className="text-2xl font-black text-blue-900">{unpaidCurrent.length} <span className="text-sm">Πελάτες</span></h4>
            </div>
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm">
              <p className="text-red-700 text-[10px] font-black uppercase">Παλιές Οφειλές</p>
              <h4 className="text-2xl font-black text-red-900">{overdueClientsCount} <span className="text-sm">Πελάτες</span></h4>
            </div>
          </div>
          
          <StatsCards 
            totalClients={clients?.length || 0}
            unpaidClients={unpaidCurrent.length}
            totalIncome={clients?.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0) || 0}
            totalDebt={allUnpaid.reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0)}
            vatDue={pendingVat.length}
          />

          <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-900 uppercase">Νέος Πελάτης ({selectedMonth})</h3>
              <div className="flex gap-2">
                 <button onClick={bulkMarkVatSubmitted} className="text-[10px] bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-black border border-blue-200 hover:bg-blue-200 transition">
                    ✅ ΜΑΖΙΚΟ ΦΠΑ ({pendingVat.length})
                 </button>
                 <button onClick={copyClientsToNextMonth} className="text-[10px] bg-green-100 text-green-700 px-4 py-2 rounded-lg font-black border border-green-200 hover:bg-green-200 transition">
                    📋 ΑΝΤΙΓΡΑΦΗ
                 </button>
              </div>
            </div>
            <div className="flex gap-2">
              <input placeholder="Όνομα" value={name} onChange={e => setName(e.target.value)} className="border border-gray-300 p-2 rounded flex-1 outline-none font-bold text-slate-900" />
              <input placeholder="ΑΦΜ" value={afm} onChange={e => setAfm(e.target.value)} className="border border-gray-300 p-2 rounded flex-1 outline-none font-bold text-slate-900" />
              <input placeholder="Αμοιβή" type="number" value={fee} onChange={e => setFee(e.target.value)} className="border border-gray-300 p-2 rounded w-24 outline-none font-bold text-slate-900" />
              <select value={vatType} onChange={e => setVatType(e.target.value)} className="border border-gray-300 p-2 rounded text-sm bg-gray-50 font-black text-slate-900">
                <option value="monthly">Μηνιαίο ΦΠΑ</option> <option value="quarterly">Τριμηνιαίο ΦΠΑ</option> <option value="none">Χωρίς ΦΠΑ</option>
              </select>
              <button onClick={addClient} className="bg-blue-600 text-white px-6 rounded-lg font-black hover:bg-blue-700 transition">ΠΡΟΣΘΗΚΗ</button>
            </div>
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
      </main>

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md text-slate-900">
            <h2 className="text-xl font-black mb-4 border-b pb-2 uppercase">Επεξεργασία</h2>
            <div className="space-y-4">
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-gray-300 p-2 rounded font-bold" />
              <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)} className="w-full border border-gray-300 p-2 rounded font-bold" />
              <select value={editVatType} onChange={e => setEditVatType(e.target.value)} className="w-full border border-gray-300 p-2 rounded font-bold">
                <option value="monthly">Μηνιαίο ΦΠΑ</option> <option value="quarterly">Τριμηνιαίο ΦΠΑ</option> <option value="none">Χωρίς ΦΠΑ</option>
              </select>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="w-full border border-gray-300 p-2 rounded h-24 text-sm font-medium" placeholder="Σημειώσεις..." />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 font-black uppercase text-xs">Ακύρωση</button>
              <button onClick={updateClient} className="px-4 py-2 bg-blue-600 text-white rounded font-black uppercase text-xs">Αποθήκευση</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
