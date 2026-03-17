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
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
 
  const [clients, setClients] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  
  async function copyClientsToNextMonth() {
  if (!clients || clients.length === 0) return alert("Δεν υπάρχουν πελάτες για αντιγραφή");
  
  // 1. Παίρνουμε τον τρέχοντα χρόνο από το state (π.χ. "2026-03")
  let [year, month] = selectedMonth.split('-').map(Number);
  
  // 2. Υπολογίζουμε τον επόμενο μήνα με απλά μαθηματικά
  let nextMonthNum = month + 1;
  let nextYearNum = year;
  
  if (nextMonthNum > 12) {
    nextMonthNum = 1;
    nextYearNum = year + 1;
  }

  // 3. Φτιάχνουμε το string (π.χ. "2026-04")
  const nextMonthStr = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}`;

  if (!confirm(`Αντιγραφή ${clients.length} πελατών από τον ${selectedMonth} στον ${nextMonthStr};`)) return;

  // 4. Προετοιμασία των νέων εγγραφών
  const newRecords = clients.map(client => ({
    user_id: user.id,
    name: client.name,
    afm: client.afm,
    monthly_fee: Number(client.monthly_fee) || 0,
    payment_status: "pending",
    vat_submitted: false,
    vat_enabled: client.vat_enabled || false,
    vat_type: client.vat_type || 'monthly',
    month: nextMonthStr // Ο νέος μήνας
  }));

  const { error } = await supabase.from("clients").insert(newRecords);

  if (error) {
    console.error("Insert error:", error);
    alert("Σφάλμα κατά την αντιγραφή: " + error.message);
  } else {
    alert(`Η αντιγραφή στον ${nextMonthStr} ολοκληρώθηκε!`);
    setSelectedMonth(nextMonthStr); // Σε πάει αυτόματα στον επόμενο μήνα
  }
}


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
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        fetchClients(authUser.id);
      } else {
        // Αντί για redirect, απλά σταματάμε το loading
        console.log("Πρέπει να συνδεθείτε");
      }
    } catch (err) {
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
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
  
  {/* Εδώ προσθέτουμε ένα flex container για τον τίτλο και το κουμπί αντιγραφής */}
  <div className="flex justify-between items-center mb-4">
    <h3 className="font-semibold text-gray-700">Νέος Πελάτης ({selectedMonth})</h3>
    
    <button 
      onClick={copyClientsToNextMonth}
      className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition font-bold border border-green-200 flex items-center gap-1"
    >
      <span>📋</span> Αντιγραφή στον επόμενο μήνα
    </button>
  </div>

  <div className="flex gap-2">
    <input 
      placeholder="Όνομα" 
      value={name} 
      onChange={e => setName(e.target.value)} 
      className="border p-2 rounded flex-1 outline-none focus:ring-1 focus:ring-blue-500" 
    />
    <input 
      placeholder="ΑΦΜ" 
      value={afm} 
      onChange={e => setAfm(e.target.value)} 
      className="border p-2 rounded flex-1 outline-none focus:ring-1 focus:ring-blue-500" 
    />
    <input 
      placeholder="Αμοιβή" 
      type="number" 
      value={fee} 
      onChange={e => setFee(e.target.value)} 
      className="border p-2 rounded w-32 outline-none focus:ring-1 focus:ring-blue-500" 
    />
    <button 
      onClick={addClient} 
      className="bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 font-medium"
      disabled={!user}
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
