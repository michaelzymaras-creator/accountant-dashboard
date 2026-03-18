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
  
  // --- 1. STATES ---
  const [name, setName] = useState("")
  const [afm, setAfm] = useState("")
  const [fee, setFee] = useState("")
  const [vatType, setVatType] = useState("monthly") // monthly, quarterly, none
  
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


  // --- 2. ΣΥΝΑΡΤΗΣΕΙΣ DATA ---
  const fetchClients = useCallback(async (userId) => {
    if (!userId) return 
    const { data, error } = await supabase
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

  // --- 3. ΛΟΓΙΚΗ ΦΠΑ (VAT STATUS) ---
  function getVatStatus(client) {
    if (!client?.vat_enabled || client?.vat_type === "none") return "none"
    
    const month = parseInt(selectedMonth.split("-")[1])
    if (client.vat_type === "monthly") return "due"
    if (client.vat_type === "quarterly") {
      return [1, 4, 7, 10].includes(month) ? "due" : "ok"
    }
    return "ok"
  }

  // --- 4. ΣΥΝΑΡΤΗΣΕΙΣ EDIT ---
  function openEditModal(client) {
    setEditingClient(client)
    setEditName(client?.name || "")
    setEditFee(client?.monthly_fee || "")
    // Αν το vat_enabled είναι false, τότε το type είναι "none"
    setEditVatType(!client?.vat_enabled ? "none" : client?.vat_type || "monthly")
    setEditNotes(client?.notes || "")
    setIsEditModalOpen(true)
  }

  async function updateClient() {
    if (!editingClient || !user?.id) return
    
    const isVatEnabled = editVatType !== "none"
    
    const { error } = await supabase
      .from("clients")
      .update({ 
        name: editName, 
        monthly_fee: Number(editFee),
        vat_enabled: isVatEnabled,
        vat_type: isVatEnabled ? editVatType : "monthly",
        notes: editNotes
      })
      .eq("id", editingClient.id)

    if (!error) {
      setIsEditModalOpen(false)
      fetchClients(user.id)
    }
  }

  // --- 5. CRUD ΛΕΙΤΟΥΡΓΙΕΣ ---
  async function addClient() {
    if (!user?.id) return
    const isVatEnabled = vatType !== "none"

    const { error } = await supabase.from("clients").insert([{
      user_id: user.id, 
      name, 
      afm, 
      monthly_fee: Number(fee) || 0,
      payment_status: "pending", 
      month: selectedMonth,
      vat_enabled: isVatEnabled,
      vat_type: isVatEnabled ? vatType : "monthly",
      vat_submitted: false
    }])
    if (!error) { setName(""); setAfm(""); setFee(""); fetchClients(user.id) }
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
      vat_enabled: c.vat_enabled, vat_type: c.vat_type, vat_submitted: false
    }))
    const { error } = await supabase.from("clients").insert(newRecords)
    if (!error) { alert("Έγινε!"); setSelectedMonth(nextMonthStr) }
  }

  async function togglePayment(client) {
    if (!user?.id) return
    const newStatus = client.payment_status === "paid" ? "pending" : "paid"
    await supabase.from("clients").update({ payment_status: newStatus }).eq("id", client.id)
    fetchClients(user.id)
  }

  async function toggleVatSubmitted(client) {
    if (!user?.id || !client.vat_enabled) return
    await supabase.from("clients").update({ vat_submitted: !client.vat_submitted }).eq("id", client.id)
    fetchClients(user.id)
  }

  async function deleteClient(id) {
    if (!user?.id || !confirm("Διαγραφή;")) return
    await supabase.from("clients").delete().eq("id", id)
    fetchClients(user.id)
  }

  if (loading || !user) return <div className="flex h-screen items-center justify-center bg-[#F9F7F2]">Φόρτωση...</div>

  return (
    <div className="min-h-screen flex bg-[#F9F7F2]">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Header selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
          
          <StatsCards 
            totalClients={clients?.length || 0}
            unpaidClients={clients?.filter(c => c.payment_status === "pending").length || 0}
            totalIncome={clients?.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0) || 0}
            vatDue={clients?.filter(c => getVatStatus(c) === "due" && !c.vat_submitted).length || 0}
          />

          <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">Νέος Πελάτης ({selectedMonth})</h3>
              <button onClick={copyClientsToNextMonth} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200 transition">📋 Αντιγραφή</button>
            </div>
            <div className="flex gap-2">
              <input placeholder="Όνομα" value={name} onChange={e => setName(e.target.value)} className="border p-2 rounded flex-1 outline-none" />
              <input placeholder="ΑΦΜ" value={afm} onChange={e => setAfm(e.target.value)} className="border p-2 rounded flex-1 outline-none" />
              <input placeholder="Αμοιβή" type="number" value={fee} onChange={e => setFee(e.target.value)} className="border p-2 rounded w-24 outline-none" />
              
              <select value={vatType} onChange={e => setVatType(e.target.value)} className="border p-2 rounded text-sm bg-gray-50 outline-none">
                <option value="monthly">Μηνιαίο ΦΠΑ</option>
                <option value="quarterly">Τριμηνιαίο ΦΠΑ</option>
                <option value="none">Χωρίς ΦΠΑ</option>
              </select>

              <button onClick={addClient} className="bg-blue-600 text-white px-6 rounded-lg font-medium">Προσθήκη</button>
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

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Επεξεργασία Πελάτη</h2>
            <div className="space-y-4">
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border p-2 rounded" placeholder="Όνομα" />
              <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)} className="w-full border p-2 rounded" placeholder="Αμοιβή" />
              <select value={editVatType} onChange={e => setEditVatType(e.target.value)} className="w-full border p-2 rounded">
                <option value="monthly">Μηνιαίο ΦΠΑ</option>
                <option value="quarterly">Τριμηνιαίο ΦΠΑ</option>
                <option value="none">Χωρίς ΦΠΑ</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600">Ακύρωση</button>
              <button onClick={updateClient} className="px-4 py-2 bg-blue-600 text-white rounded">Αποθήκευση</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
