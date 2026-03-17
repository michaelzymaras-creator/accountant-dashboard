'use client'

import { supabase } from "../lib/supabase" 
import { useState, useEffect } from "react"

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import StatsCards from "../components/StatsCards"
import ClientsTable from "../components/ClientsTable"

export default function Home() {
  const [name, setName] = useState("")
  const [afm, setAfm] = useState("")
  const [fee, setFee] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("2025-03")
  const [clients, setClients] = useState([])
  const [user, setUser] = useState(null)

  useEffect(() => {
    checkUser()
  }, [])

  // Κάθε φορά που αλλάζει ο μήνας ή ο χρήστης, φέρε τα νέα δεδομένα
  useEffect(() => {
    if (user) {
      fetchClients(user.id)
    }
  }, [selectedMonth, user])

useEffect(() => {
  // Αυτό "πιάνει" αμέσως αν ο χρήστης είναι ήδη συνδεδεμένος
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      setUser(session.user)
    }
  })

  // Αυτό παρακολουθεί αν αλλάξει κάτι (π.χ. login/logout)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null)
  })

  return () => subscription.unsubscribe()
}, [])


  async function fetchClients(userId) {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId)
      .eq("month", selectedMonth) // Φιλτράρισμα βάσει μήνα
      .order("created_at", { ascending: false })

    if (data) setClients(data)
    if (error) console.error("Error fetching:", error)
  }

  async function addClient() {
    if (!user) return alert("Περιμένετε να φορτώσει ο χρήστης")
    if (!name || !afm) return alert("Βάλε όνομα και ΑΦΜ")

    const { error } = await supabase
      .from("clients")
      .insert([{
        user_id: user.id,
        name,
        afm,
        monthly_fee: Number(fee) || 0,
        payment_status: "pending",
        month: selectedMonth,
        vat_enabled: true, // Προεπιλογή
        vat_type: 'monthly'
      }])

    if (error) {
      alert(error.message)
      return
    }

    setName(""); setAfm(""); setFee("")
    fetchClients(user.id)
  }

  // Λειτουργία Πληρωμής
  async function togglePayment(client) {
    const newStatus = client.payment_status === "paid" ? "pending" : "paid"
    const { error } = await supabase
      .from("clients")
      .update({ payment_status: newStatus })
      .eq("id", client.id)

    if (!error) fetchClients(user.id)
  }

  // Λειτουργία ΦΠΑ
  async function toggleVatSubmitted(client) {
    const { error } = await supabase
      .from("clients")
      .update({ vat_submitted: !client.vat_submitted })
      .eq("id", client.id)

    if (!error) fetchClients(user.id)
  }

  // Διαγραφή Πελάτη
  async function deleteClient(id) {
    if (!confirm("Είσαι σίγουρος για τη διαγραφή;")) return
    
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)

    if (!error) fetchClients(user.id)
  }

  function getVatStatus(client) {
    // Εδώ μπορείς να βάλεις λογική για το αν πλησιάζει η προθεσμία
    return "ok"
  }

  return (
    <div className="min-h-screen flex bg-[#F9F7F2]">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Header selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
          
          <StatsCards 
            totalClients={clients.length}
            unpaidClients={clients.filter(c => c.payment_status === "pending").length}
            totalIncome={clients.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + Number(c.monthly_fee || 0), 0)}
          />

          {/* Form Νέου Πελάτη */}
          <div className="bg-white p-4 rounded-xl shadow mb-6">
            <h3 className="mb-3 font-semibold text-gray-700">Νέος Πελάτης ({selectedMonth})</h3>
            <div className="flex gap-2">
              <input placeholder="Όνομα" value={name} onChange={e => setName(e.target.value)} className="border p-2 rounded flex-1" />
              <input placeholder="ΑΦΜ" value={afm} onChange={e => setAfm(e.target.value)} className="border p-2 rounded flex-1" />
              <input placeholder="Αμοιβή" type="number" value={fee} onChange={e => setFee(e.target.value)} className="border p-2 rounded w-32" />
              <button
                onClick={addClient} 
                disabled={!user} // Το κουμπί "κλειδώνει" μέχρι να φορτώσει ο χρήστης
                className={`px-6 rounded-lg transition ${
                    !user 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                    >
                    {!user ? "Φορτώνει..." : "Προσθήκη"}
                </button>

            </div>
          </div>

          <ClientsTable
            clients={clients}
            togglePayment={togglePayment}
            toggleVatSubmitted={toggleVatSubmitted}
            deleteClient={deleteClient}
            setEditingClient={() => {}} // Θα το φτιάξουμε μετά αν θες
            getVatStatus={getVatStatus}
          />
        </div>
      </main>
    </div>
  )
}
