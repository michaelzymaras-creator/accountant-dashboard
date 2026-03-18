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
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [clients, setClients] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // States για το Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [editName, setEditName] = useState("")
  const [editFee, setEditFee] = useState("")

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
    if (error) console.error("Fetch error:", error)
  }, [selectedMonth])

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          setUser(authUser)
          fetchClients(authUser.id)
        } else {
          router.push('/login')
        }
      } catch (err) {
        console.error("Auth error:", err)
      } finally {
        setLoading(false)
      }
    }
    initAuth()
  }, [fetchClients, router])

  // --- 3. ΣΥΝΑΡΤΗΣΕΙΣ EDIT ---
  function openEditModal(client) {
    setEditingClient(client)
    setEditName(client?.name || "")
    setEditFee(client?.monthly_fee || "")
    setIsEditModalOpen(true)
  }

  async function updateClient() {
    if (!editingClient || !user?.id) return
    const { error } = await supabase
      .from("clients")
      .update({ name: editName, monthly_fee: Number(editFee) })
      .eq("id", editingClient.id)

    if (!error) {
      setIsEditModalOpen(false)
      fetchClients(user.id)
    }
  }

  // --- 4. ΑΛΛΕΣ ΣΥΝΑΡΤΗΣΕΙΣ ---
  async function addClient() {
    if (!user?.id) return alert("Δεν είστε συνδεδεμένος")
    const { error } = await supabase.from("clients").insert([{
      user_id: user.id, name, afm, monthly_fee: Number(fee) || 0,
      payment_status: "pending", month: selectedMonth
    }])
    if (!error) { 
      setName(""); setAfm(""); setFee(""); 
      fetchClients(user.id) 
    }
  }

  async function copyClientsToNextMonth() {
    if (!clients || clients.length === 0) return alert("Δεν υπάρχουν πελάτες")
    let [year, month] = selectedMonth.split('-').map(Number)
    month++; if (month > 12) { month = 1; year++; }
    const nextMonthStr = `${year}-${String(month).padStart(2, '0')}`

    if (!confirm(`Αντιγραφή ${clients.length} πελατών στον ${nextMonthStr};`)) return
    const newRecords = clients.map(c => ({
      user_id: user?.id, name: c.name, afm: c.afm, monthly_fee: c.monthly_fee,
      payment_status: "pending", month: nextMonthStr
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

  async function deleteClient(id) {
    if (!user?.id) return
    if (confirm("Διαγραφή;")) {
      await supabase.from("clients").delete().eq("id", id)
      fetchClients(user.id)
    }
  }

  // --- ΠΡΟΣΤΑΣΙΑ ΓΙΑ ΤΟ USER NULL ---
  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center bg-[#F9F7F2]">Φόρτωση δεδομένων...</div>
  }

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
            vatDue={0} 
          />

          <div className="bg-white p-4 rounded-xl shadow mb-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">Νέος Πελάτης ({selectedMonth})</h3>
              <button onClick={copyClientsToNextMonth} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200 transition">
                📋 Αντιγραφή στον επόμενο μήνα
              </button>
            </div>
            <div className="flex gap-2">
              <input placeholder="Όνομα" value={name} onChange={e => setName(e.target.value)} className="border p-2 rounded flex-1 outline-none focus:ring-1 focus:ring-blue-400" />
              <input placeholder="ΑΦΜ" value={afm} onChange={e => setAfm(e.target.value)} className="border p-2 rounded flex-1 outline-none focus:ring-1 focus:ring-blue-400" />
              <input placeholder="Αμοιβή" type="number" value={fee} onChange={e => setFee(e.target.value)} className="border p-2 rounded w-32 outline-none focus:ring-1 focus:ring-blue-400" />
              <button onClick={addClient} className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 transition">Προσθήκη</button>
            </div>
          </div>

          <ClientsTable
            clients={clients || []}
            togglePayment={togglePayment}
            toggleVatSubmitted={() => {}}
            deleteClient={deleteClient}
            setEditingClient={openEditModal}
            getVatStatus={() => "ok"}
          />
        </div>
      </main>

      {/* --- EDIT MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Επεξεργασία Πελάτη</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Όνομα</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Αμοιβή (€)</label>
                <input type="number" value={editFee} onChange={e => setEditFee(e.target.value)} className="w-full border p-2 rounded" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Ακύρωση</button>
              <button onClick={updateClient} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Αποθήκευση</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
