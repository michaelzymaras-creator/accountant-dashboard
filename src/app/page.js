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
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [editName, setEditName] = useState("")
  const [editFee, setEditFee] = useState("")
  const [editVatType, setEditVatType] = useState("monthly")
  const [editNotes, setEditNotes] = useState("")

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

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)
        fetchClients(authUser.id)
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    initAuth()
  }, [fetchClients, router])

  async function addClient() {
    if (!user?.id) return
    const isVatEnabled = vatType !== "none"
    const { error } = await supabase.from("clients").insert([{
      user_id: user.id, name, afm, monthly_fee: Number(fee) || 0,
      payment_status: "pending", month: selectedMonth,
      vat_enabled: isVatEnabled, vat_type: isVatEnabled ? vatType : "monthly",
      vat_submitted: false, notes: "", previous_debt: 0
    }])
    if (!error) { setName(""); setAfm(""); setFee(""); fetchClients(user.id) }
  }

  async function copyClientsToNextMonth() {
    if (!clients?.length || !user?.id) return alert("Δεν υπάρχουν πελάτες")
    let [year, month] = selectedMonth.split('-').map(Number)
    month++; if (month > 12) { month = 1; year++; }
    const nextMonthStr = `${year}-${String(month).padStart(2, '0')}`
    if (!confirm(`Αντιγραφή στον ${nextMonthStr};`)) return

    const newRecords = clients.map(c => {
      // Υπολογισμός χρέους που μεταφέρεται:
      // Αν είναι απλήρωτος τώρα, το τωρινό fee προστίθεται στο παλιό χρέος
      const currentUnpaid = c.payment_status === "pending" ? Number(c.monthly_fee) : 0;
      const totalNewPreviousDebt = currentUnpaid + (Number(c.previous_debt) || 0);

      return {
        user_id: user.id, name: c.name, afm: c.afm, monthly_fee: c.monthly_fee,
        previous_debt: totalNewPreviousDebt, // Μεταφορά χρέους
        payment_status: "pending", month: nextMonthStr,
        vat_enabled: c.vat_enabled, vat_type: c.vat_type, vat_submitted: false, notes: c.notes
      }
    })

    const { error } = await supabase.from("clients").insert(newRecords)
    if (!error) { alert("Έγινε!"); setSelectedMonth(nextMonthStr) }
  }

  async function updateClient() {
    if (!editingClient || !user?.id) return
    const isVatEnabled = editVatType !== "none"
    const { error } = await supabase
      .from("clients")
      .update({ 
        name: editName, monthly_fee: Number(editFee),
        vat_enabled: isVatEnabled, vat_type: isVatEnabled ? editVatType : "monthly",
        notes: editNotes 
      })
      .eq("id", editingClient.id)
    if (!error) { setIsEditModalOpen(false); fetchClients(user.id); }
  }

  async function togglePayment(client) {
    if (!user?.id) return
    const newStatus = client.payment_status === "paid" ? "pending" : "paid"
    await supabase.from("clients").update({ payment_status: newStatus }).eq("id", client.id)
    fetchClients(user.id)
  }

  async function toggleVatSubmitted(client) {
    if (!user?.id) return
    await supabase.from("clients").update({ vat_submitted: !client.vat_submitted }).eq("id", client.id)
    fetchClients(user.id)
  }

  async function deleteClient(id) {
    if (!user?.id || !confirm("Διαγραφή;")) return
    await supabase.from("clients").delete().eq("id", id)
    fetchClients(user.id)
  }

  function openEditModal(client) {
    setEditingClient(client)
    setEditName(client?.name || "")
    setEditFee(client?.monthly_fee || "")
    setEditVatType(!client?.vat_enabled ? "none" : client?.vat_type || "monthly")
    setEditNotes(client?.notes || "")
    setIsEditModalOpen(true)
  }

  if (loading || !user) return <div className="flex h-screen items-center justify-center bg-[#F9F7F2] text-slate-900 font-bold uppercase tracking-widest">Φόρτωση...</div>

  return (
    <div className="min-h-screen flex bg-[#F9F7F2] text-slate-900">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Header selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
          <StatsCards 
            totalClients={clients?.length || 0}
            unpaidClients={clients?.filter(c => c.payment_status === "pending").length || 0}
            totalIncome={clients?.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0) || 0}
            // Συνολικό χρέος (Τρέχοντα απλήρωτα + Παλιά χρέη)
            totalDebt={clients?.reduce((sum, c) => {
               const cur = c.payment_status === "pending" ? Number(c.monthly_fee) : 0;
               return sum + cur + Number(c.previous_debt || 0);
            }, 0) || 0}
            vatDue={clients?.filter(c => getVatStatus(c).status === "due" && !c.vat_submitted).length || 0}
          />
          <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-slate-900 uppercase">Νέος Πελάτης ({selectedMonth})</h3>
              <button onClick={copyClientsToNextMonth} className="text-[10px] bg-green-100 text-green-700 px-4 py-2 rounded-lg font-black border border-green-200 hover:bg-green-200 transition">📋 ΑΝΤΙΓΡΑΦΗ ΣΤΟΝ ΕΠΟΜΕΝΟ ΜΗΝΑ</button>
            </div>
            <div className="flex gap-2">
              <input placeholder="Όνομα" value={name} onChange={e => setName(e.target.value)} className="border border-gray-300 p-2 rounded flex-1 outline-none font-bold" />
              <input placeholder="ΑΦΜ" value={afm} onChange={e => setAfm(e.target.value)} className="border border-gray-300 p-2 rounded flex-1 outline-none font-bold" />
              <input placeholder="Αμοιβή" type="number" value={fee} onChange={e => setFee(e.target.value)} className="border border-gray-300 p-2 rounded w-24 outline-none font-bold" />
              <select value={vatType} onChange={e => setVatType(e.target.value)} className="border border-gray-300 p-2 rounded text-sm bg-gray-50 font-black outline-none">
                <option value="monthly">Μηνιαίο ΦΠΑ</option>
                <option value="quarterly">Τριμηνιαίο ΦΠΑ</option>
                <option value="none">Χωρίς ΦΠΑ</option>
              </select>
              <button onClick={addClient} className="bg-blue-600 text-white px-6 rounded-lg font-black hover:bg-blue-700 transition">ΠΡΟΣΘΗΚΗ</button>
            </div>
          </div>
          <ClientsTable
            clients={clients || []}
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
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-black mb-4 border-b pb-2 uppercase">Επεξεργασία</h2>
            <div className="space-y-4">
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-gray-300 p-2 rounded font-bold" placeholder="Όνομα" />
              <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)} className="w-full border border-gray-300 p-2 rounded font-bold" placeholder="Αμοιβή" />
              <select value={editVatType} onChange={e => setEditVatType(e.target.value)} className="w-full border border-gray-300 p-2 rounded font-bold">
                <option value="monthly">Μηνιαίο ΦΠΑ</option>
                <option value="quarterly">Τριμηνιαίο ΦΠΑ</option>
                <option value="none">Χωρίς ΦΠΑ</option>
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
