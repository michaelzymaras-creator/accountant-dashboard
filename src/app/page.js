'use client'

import { supabase } from "../lib/supabase" 
import { useState, useEffect, useCallback } from "react"

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
  const [loading, setLoading] = useState(true)

  // Χρησιμοποιούμε useCallback για να μην ξαναδημιουργείται η συνάρτηση άσκοπα
  const fetchClients = useCallback(async (userId) => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", userId)
      .eq("month", selectedMonth)
      .order("created_at", { ascending: false })

    if (data) setClients(data)
    if (error) console.error("Error fetching clients:", error)
  }, [selectedMonth])

useEffect(() => {
  const initAuth = async () => {
    try {
      // Χρησιμοποιούμε getUser() αντί για getSession() για μεγαλύτερη αξιοπιστία
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      
      if (authUser) {
        setUser(authUser);
        fetchClients(authUser.id);
      } else {
        console.log("No active user session found");
        // Αν θες να το ξεκλειδώσεις για τεστ, μπορείς να βάλεις setUser({id: 'dummy'}) 
        // Αλλά το σωστό είναι να σιγουρευτείς ότι έχεις κάνει login
      }
    } catch (err) {
      console.error("Auth error:", err);
    } finally {
      setLoading(false); // Σταματάει το loading ό,τι και να γίνει
    }
  };

  initAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      setUser(session.user);
      fetchClients(session.user.id);
    } else {
      setUser(null);
    }
  });

  return () => subscription.unsubscribe();
}, [fetchClients]);


  async function addClient() {
    if (!user?.id) return alert("Δεν είστε συνδεδεμένος")
    if (!name || !afm) return alert("Συμπληρώστε Όνομα και ΑΦΜ")

    const { error } = await supabase
      .from("clients")
      .insert([{
        user_id: user.id,
        name,
        afm,
        monthly_fee: Number(fee) || 0,
        payment_status: "pending",
        month: selectedMonth,
        vat_enabled: true,
        vat_type: 'monthly'
      }])

    if (error) {
      alert("Σφάλμα βάσης: " + error.message)
    } else {
      setName(""); setAfm(""); setFee("")
      fetchClients(user.id)
    }
  }

  // --- CRUD Λειτουργίες ---
  async function togglePayment(client) {
    if (!user) return
    const newStatus = client.payment_status === "paid" ? "pending" : "paid"
    await supabase.from("clients").update({ payment_status: newStatus }).eq("id", client.id)
    fetchClients(user.id)
  }

  async function toggleVatSubmitted(client) {
    if (!user) return
    await supabase.from("clients").update({ vat_submitted: !client.vat_submitted }).eq("id", client.id)
    fetchClients(user.id)
  }

  async function deleteClient(id) {
    if (!user || !confirm("Διαγραφή πελάτη;")) return
    await supabase.from("clients").delete().eq("id", id)
    fetchClients(user.id)
  }

  // Loading state για να μην "σκάει" η σελίδα στην αρχή
  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#F9F7F2]">Φόρτωση...</div>
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
            totalIncome={clients.filter(c => c.payment_status === "paid").reduce((sum, c) => sum + (Number(c.monthly_fee) || 0), 0)}
          />

          <div className="bg-white p-4 rounded-xl shadow mb-6">
            <h3 className="mb-3 font-semibold text-gray-700">Νέος Πελάτης ({selectedMonth})</h3>
            <div className="flex gap-2">
              <input placeholder="Όνομα" value={name} onChange={e => setName(e.target.value)} className="border p-2 rounded flex-1" />
              <input placeholder="ΑΦΜ" value={afm} onChange={e => setAfm(e.target.value)} className="border p-2 rounded flex-1" />
              <input placeholder="Αμοιβή" type="number" value={fee} onChange={e => setFee(e.target.value)} className="border p-2 rounded w-32" />
              <button 
                onClick={addClient} 
                className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                
              >
                Προσθήκη
              </button>
            </div>
          </div>

          <ClientsTable
            clients={clients}
            togglePayment={togglePayment}
            toggleVatSubmitted={toggleVatSubmitted}
            deleteClient={deleteClient}
            setEditingClient={() => {}}
            getVatStatus={() => "ok"}
          />
        </div>
      </main>
    </div>
  )
}
