'use client'
import { Cinzel } from "next/font/google"

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400","600"]
})

const colors = {
  background: "#F9F7F2", // Pentelic White
  primary: "#1D63A8", // Aegean Azure
  gold: "#D4AF37", // Golden Ochre
  terracotta: "#B35A44", // Terracotta Clay
  text: "#33302E" // Deep Olive
}
import * as XLSX from 'xlsx'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
export default 
function Home() {
  const [editingClient, setEditingClient] = useState(null)
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const totalClients = clients.length
  const unpaidClients = clients.filter(c => c.payment_status === 'pending').length
  const [name, setName] = useState('')
  const [afm, setAfm] = useState('')
  const [fee, setFee] = useState('')
  const [vatEnabled, setVatEnabled] = useState(false)
  const [vatType, setVatType] = useState('monthly')
  const [notes, setNotes] = useState('')
  const [showUnpaid, setShowUnpaid] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0,7))
  const exportExcel = () => {
    const data = clients.map
    (c => 
      (
        {
          Πελάτης: c.name,
          ΑΦΜ: c.afm,
          Αμοιβή: c.monthly_fee,
          Πληρωμή: c.payment_status,
          ΦΠΑ: c.vat_submitted ? "ΝΑΙ" : "ΟΧΙ"
        }
      )
    )
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Clients")
    XLSX.writeFile(wb, `clients-${selectedMonth}.xlsx`)
  }  
  const viewHistory = async (client) => {
    const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('client_name', client.name)
    .order('month', { ascending: false })
    let message = ""
    data.forEach(p => {
      message += `${p.month} : ${p.status === 'paid' ? "✅" : "❌"}\n`
    })
    alert(message)
  }
  useEffect(() => {
    checkUser()
  }, [])
  useEffect(() => {
    if (user) {
      fetchClients(user.id)
    }
  }, [selectedMonth])
  const checkUser = async () => {
    const { data } = await supabase.auth.getUser()
    if (data.user) {
      setUser(data.user)
      fetchClients(data.user.id)
    }
  }
  const signIn = async () => {
    const email = prompt("Email:")
    const password = prompt("Password:")
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
      else {
    setUser(data.user)
    fetchClients(data.user.id)}
  }
  const fetchClients = async (userId) => {
    const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .eq('month', selectedMonth)
    .order('created_at', { ascending: false })
    if (data) setClients(data)
  }
  const addClient = async () => {
    if (!name) return alert("Βάλε όνομα")
      setLoading(true)
    const { data } = await supabase.from('clients').insert([
      {
        user_id: user.id,
        name,
        afm,
        monthly_fee: fee,
        payment_status: 'pending',
        vat_enabled: vatEnabled,
        vat_submitted: false,
        vat_type: vatType,
        notes,
        month: selectedMonth
      }
    ])
    .select()
    setClients([data[0], ...clients])
    setName('')
    setAfm('')
    setFee('')
    setVatEnabled(false)
    setNotes('')
    setVatType('monthly')
    setLoading(false)
  }
  const createNewMonth = async () => {
    const previousMonth = new Date(selectedMonth)
    previousMonth.setMonth(previousMonth.getMonth() - 1)
    const prevMonthString = previousMonth.toISOString().slice(0,7)
    const { data: existing } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', selectedMonth)
    if (existing.length > 0)
      { alert("Ο μήνας υπάρχει ήδη!")
        return 
      }
    const { data: lastMonthClients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', prevMonthString)
    if (!lastMonthClients || lastMonthClients.length === 0) { 
      alert("Δεν υπάρχουν πελάτες στον προηγούμενο μήνα")
      return
    }
    const newClients = lastMonthClients.map(c =>
      ({
        user_id: user.id,
        name: c.name,
          afm: c.afm,
          monthly_fee: c.monthly_fee,
          payment_status: 'pending',
          vat_enabled: c.vat_enabled,
          vat_submitted: false,
          vat_type: c.vat_type,
          notes: c.notes,
          month: selectedMonth
        })
      )
      await supabase.from('clients').insert(newClients)
      fetchClients(user.id)
  }
  const togglePayment = async (client) => {
    
    const newStatus = client.payment_status === 'paid' ? 'pending' : 'paid'
    
    await supabase
    .from('clients')
    .update({ payment_status: newStatus })
    .eq('id', client.id)
    
    const { data: existing } = await supabase
    .from('payments')
    .select('*')
    .eq('client_name', client.name)
    .eq('month', selectedMonth)
    
    if (existing.length === 0) {
      
      await supabase
      .from('payments')
      .insert({
        client_name: client.name,
        month: selectedMonth,
        status: newStatus
      })
    
    } else {
      
      await supabase
      .from('payments')
      .update({ status: newStatus })
      .eq('client_name', client.name)
      .eq('month', selectedMonth)
    }

    fetchClients(user.id)

  }

  const toggleVatSubmitted = async (client) => {
    await supabase
    .from('clients')
    .update({ vat_submitted: !client.vat_submitted }).eq('id', client.id)
    fetchClients(user.id)
  }
  const deleteClient = async (id) => {
    const confirmDelete = confirm("Είσαι σίγουρος;")
    if (!confirmDelete) return
    await supabase.from('clients').delete().eq('id', id)
    fetchClients(user.id)
  }
  const updateClient = async () => {
    const { error } = await supabase
    .from('clients')
    .update({
      name: editingClient.name,
      afm: editingClient.afm,
      monthly_fee: editingClient.monthly_fee,
      vat_type: editingClient.vat_type,
      notes: editingClient.notes
    })
    .eq('id', editingClient.id)
    if (error) {
      alert(error.message)
      return
    }
    setEditingClient(null)
    fetchClients(user.id)
  }
  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text(`Πελάτες Μήνα: ${selectedMonth}`, 14, 15)
    const tableData = clients.map(c => [
      c.name,
      c.afm,
      `${c.monthly_fee} €`,
      c.payment_status === 'paid' ? "Πληρώθηκε" : "Απλήρωτος",
      c.vat_enabled ? (c.vat_submitted ? "Υποβλήθηκε" : "Εκκρεμεί") : "-"
    ])
    autoTable(doc, { head: [["Πελάτης", "ΑΦΜ", "Αμοιβή", "Πληρωμή", "ΦΠΑ"]], 
      body: tableData,
      startY: 20
    })
    doc.save(`clients-${selectedMonth}.pdf`)
  }
  const filteredClients = clients
  .filter(c => !showUnpaid || c.payment_status === 'pending')
  .filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const totalIncome = clients
  .filter(c => c.payment_status === 'paid')
  .reduce((sum, c) => sum + Number(c.monthly_fee || 0), 0)
  .toFixed(2)
  const chartData = [
    {
      name: "Πληρωμένοι",
      value: clients.filter(c => c.payment_status === 'paid').length
    },
    {
      name: "Απλήρωτοι",
      value: clients.filter(c => c.payment_status === 'pending').length
    }
  ]
  
  const getVatStatus = (client) => {
    
    const month = Number(selectedMonth.split("-")[1])
    
    if (client.vat_type === "monthly") {
      return "due"
    }
    
    if (client.vat_type === "quarterly") {
      if ([3,6,9,12].includes(month)) {
        return "due"
      }
    }
    
    return "ok"
  }

  const vatDueClients = clients.filter(
    c => c.vat_enabled && !c.vat_submitted && getVatStatus(c) === "due"
  )
  
  if (!user) {
    return (
    <div className="min-h-screen flex items-center justify-center"
    style={{backgroundColor: colors.background}}>
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <h2 className="text-xl font-bold mb-4">
          TaxTick Login
        </h2>
        
        <button
        onClick={signIn}
        className="text-white px-4 py-2 rounded-xl"
        style={{backgroundColor: colors.primary}}
        >
          Σύνδεση
        </button>
        
      </div>

    </div>
    )
  }
  
  {/* Sidebar */}
  <aside className="w-64 bg-white shadow-lg p-6 flex flex-col">
    <h1
    className={`${cinzel.className} text-3xl mb-8`}
    style={{color: colors.gold}}
    >
      TaxTick
    </h1>
    
    <nav className="flex flex-col gap-3 text-sm">
      
      <button className="text-left hover:bg-gray-100 p-2 rounded">
        📊 Dashboard
      </button>
    <button className="text-left hover:bg-gray-100 p-2 rounded">
      👥 Πελάτες
    </button>
    <button className="text-left hover:bg-gray-100 p-2 rounded">
      📄 Reports
    </button>
    <button className="text-left hover:bg-gray-100 p-2 rounded">
      ⚙ Settings
    </button>
    
    </nav>
    
  </aside>
  
  {/* Main Content */}
  
  <main className="flex-1 p-8">

    <div className="max-w-6xl mx-auto"></div>

    <div className="flex justify-between items-center mb-8">
      
      <div>
        <h2 className="text-2xl font-bold">
          Dashboard
        </h2>
        <p className="text-gray-500 text-sm">
          Διαχείριση πελατών και πληρωμών
        </p>
      </div>
      
      <input
      type="month"
      value={selectedMonth}
      onChange={(e)=>setSelectedMonth(e.target.value)}
      className="border p-2 rounded-lg"
      />
    </div>

    <h2 className="text-lg mb-8" style={{color: colors.text}}>
      by Michael Nerouppos
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"></div>
    <div className="mb-6">
      <label className="block text-sm font-semibold mb-1">
        Επιλογή Μήνα
      </label>
      <input
      type="month"
      value={selectedMonth} 
      onChange={(e) => setSelectedMonth(e.target.value)}
      className="border p-2 rounded-lg"
      />
    </div>
    
    {/* Add Client Card */}
    <div className="bg-white p-6 rounded-2xl shadow mb-8">
      <h2 className="font-semibold mb-4">Προσθήκη Πελάτη</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input className="border p-2 rounded-lg"
        placeholder="Όνομα"
        value={name}
        onChange={e => setName(e.target.value)}
        />
        <input className="border p-2 rounded-lg"
        placeholder="ΑΦΜ"
        value={afm}
        onChange={e => setAfm(e.target.value)}
        />
        <input
        type="number"
        step="0.01"
        className="border p-2 rounded-lg"
        placeholder="Μηνιαία Αμοιβή"
        value={fee}
        onChange={e => setFee(e.target.value)}
        />
      </div>
      
      <div className="mt-4">
        <label className="flex items-center gap-2">
          {vatEnabled && ( <select className="border p-2 rounded-lg mt-2" value={vatType} onChange={(e)=>setVatType(e.target.value)} >
            <option value="monthly">Μηνιαίο ΦΠΑ</option>
            <option value="quarterly">Τριμηνιαίο ΦΠΑ</option>
            </select> 
          )}
          <input
          type="checkbox"
          checked={vatEnabled}
          onChange={e => setVatEnabled(e.target.checked)}
          />Έχει ΦΠΑ
        </label>
      </div>
      
      <textarea
      className="border p-2 rounded-lg w-full mt-4"
      placeholder="Παρατηρήσεις"
      value={notes}
      onChange={e => setNotes(e.target.value)}
      />
      <button onClick={addClient} 
      disabled={loading} 
      className="text-white px-4 py-2 rounded-xl"
      style={{backgroundColor: colors.primary}} > {loading ? "Προσθήκη..." : "Προσθήκη"} 
      </button>
    </div>
    
    <div className="flex gap-4 mb-4">
      <button onClick={createNewMonth} className="bg-green-600 text-white px-4 py-2 rounded-xl" > 📅 Δημιουργία Μήνα </button>
      <button onClick={exportPDF} 
      className="text-white px-4 py-2 rounded-xl"
      style={{backgroundColor: colors.primary}}
      > 
      📄 Export PDF 
      </button>
      
      <button onClick={exportExcel} className="bg-black text-white px-4 py-2 rounded-xl mb-4" > 📥 Export Excel </button>
      
    </div>
    
    <input
    type="text"
    placeholder="🔎 Αναζήτηση πελάτη"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="border p-2 rounded-lg mb-4 w-full"
    />
    
    {vatDueClients.length > 0 && (
      <div style={{
        backgroundColor:"#F5E2DD",
        border:`2px solid ${colors.terracotta}`,
        color:colors.terracotta
      }} 
      > ⚠ {vatDueClients.length} πελάτες έχουν υποβολή ΦΠΑ
      </div>
    )}
    
    <button onClick={() => setShowUnpaid(!showUnpaid)} className="mb-6 bg-gray-800 text-white px-4 py-2 rounded-xl" > {showUnpaid ? "Δείξε Όλους" : "Μόνο Απλήρωτοι"} </button>
    
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead style={{backgroundColor:"#EFE9DC"}}> 
          <tr>
            <th className="p-3 text-left">Πελάτης</th>
            <th className="p-3 text-left">ΑΦΜ</th>
            <th className="p-3 text-left">Αμοιβή</th>
            <th className="p-3 text-left">Πληρωμή</th>
            <th className="p-3 text-left">ΦΠΑ</th>
            <th className="p-3 text-left">Ενέργειες</th>
          </tr>
        </thead>
        
        <tbody>
          {filteredClients.map(client => (
            <tr key={client.id} className={`border-t ${ client.payment_status === 'paid'? "bg-green-50": "bg-red-50"}`}  >
              <td className="p-3 font-semibold"> {client.name} </td>
              <td className="p-3"> {client.afm} </td>
              <td className="p-3"> {client.monthly_fee} € </td>
              <td className="p-3"> {client.payment_status === 'paid' ? '✅' : '❌'} </td>
              <td className="p-2 border"> {client.vat_enabled ? ( <> {client.vat_type === "monthly" ? "Μηνιαίο" : "Τριμηνιαίο"}
              {client.vat_submitted ? ( <span className="text-green-600 ml-2">✅ Υποβλήθηκε</span> ) : ( <span className="text-red-500 ml-2">❌ Εκκρεμεί</span> ) }
              {getVatStatus(client) === "due" && !client.vat_submitted && ( <span className="text-red-600 ml-2 font-bold">⚠ Υποβολή</span> ) } </> ) : ( "Δέν έχει ΦΠΑ") }
              </td>
              <td className="p-3 space-x-3">
                <button 
                onClick={() => togglePayment(client)} 
                className="text-white px-4 py-2 rounded-xl"
                style={{backgroundColor: colors.primary}} 
                >
                  Πληρωμή
                </button>
                {client.vat_enabled && (
                  <button
                  onClick={() => toggleVatSubmitted(client)}
                  className={`px-2 py-1 rounded text-white text-sm ${
                    client.vat_submitted ? "bg-green-500" : "bg-red-500"
                  }`} >
                    
                    {client.vat_submitted ? "ΦΠΑ ✓" : "ΦΠΑ"}
                  </button>
                )}
                
                <button onClick={() => setEditingClient(client)} className="text-green-600 text-sm" > Edit </button>
                <button onClick={() => deleteClient(client.id)} className="bg-red-500 text-white px-2 py-1 rounded"> Διαγραφή </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </main>
  
  {editingClient && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl w-96">
          <h2 className="text-xl font-bold mb-4">Επεξεργασία Πελάτη</h2>
          <input className="border p-2 rounded-lg w-full mb-3" value={editingClient.name} onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })} />
          <input className="border p-2 rounded-lg w-full mb-3" value={editingClient.afm} onChange={(e) => setEditingClient({ ...editingClient, afm: e.target.value })} />
          <input className="border p-2 rounded-lg w-full mb-3" value={editingClient.monthly_fee} onChange={(e) => setEditingClient({ ...editingClient, monthly_fee: e.target.value })}/>
          <select className="border p-2 rounded-lg w-full mb-3" value={editingClient.vat_type || "monthly"} onChange={(e)=> setEditingClient({...editingClient, vat_type:e.target.value}) } >
            <option value="monthly">Μηνιαίο ΦΠΑ</option>
            <option value="quarterly">Τριμηνιαίο ΦΠΑ</option>
            </select>
            <textarea className="border p-2 rounded-lg w-full mb-3" value={editingClient.notes || ''} onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value }) } />
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingClient(null)} className="px-4 py-2 bg-gray-300 rounded-lg" > Ακύρωση </button>
                <button onClick={updateClient} 
                className="text-white px-4 py-2 rounded-xl"
                style={{backgroundColor: colors.primary}} 
                >
                  Αποθήκευση
                </button>
              </div>
        </div>
      </div>
  )}
}