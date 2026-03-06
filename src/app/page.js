'use client'
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Home() {
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [name, setName] = useState('')
  const [afm, setAfm] = useState('')
  const [fee, setFee] = useState('')
  const [vatEnabled, setVatEnabled] = useState(false)
  const [notes, setNotes] = useState('')
  const [showUnpaid, setShowUnpaid] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
const [selectedMonth, setSelectedMonth] = useState(
  new Date().toISOString().slice(0,7)
)
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
      fetchClients(data.user.id)
    }
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
        notes,
        month: selectedMonth
      }
    ]).select()

    setClients([data[0], ...clients])
    setName('')
    setAfm('')
    setFee('')
    setVatEnabled(false)
    setNotes('')
    setLoading(false)
  }

  const createNewMonth = async () => {

  if (!clients.length) {
    alert("Δεν υπάρχουν πελάτες για αντιγραφή")
    return
  }

  const newClients = clients.map(c => ({
    user_id: user.id,
    name: c.name,
    afm: c.afm,
    monthly_fee: c.monthly_fee,
    payment_status: 'pending',
    vat_enabled: c.vat_enabled,
    vat_submitted: false,
    notes: c.notes,
    month: selectedMonth
  }))

  await supabase.from('clients').insert(newClients)

  fetchClients(user.id)
}
  const togglePayment = async (client) => {
    await supabase
      .from('clients')
      .update({
        payment_status: client.payment_status === 'paid' ? 'pending' : 'paid'
      })
      .eq('id', client.id)

    fetchClients(user.id)
  }

  const toggleVatSubmitted = async (client) => {
    await supabase
      .from('clients')
      .update({ vat_submitted: !client.vat_submitted })
      .eq('id', client.id)

    fetchClients(user.id)
  }

  const deleteClient = async (id) => {
    const confirmDelete = confirm("Είσαι σίγουρος;")
    if (!confirmDelete) return

    await supabase.from('clients').delete().eq('id', id)
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

  autoTable(doc, {
    head: [["Πελάτης", "ΑΦΜ", "Αμοιβή", "Πληρωμή", "ΦΠΑ"]],
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
    
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Λογιστικό Dashboard</h2>
          <button
            onClick={signIn}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700"
          >
            Σύνδεση
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Πελάτες</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">

<div className="bg-white p-4 rounded-xl shadow">
<div className="text-sm text-gray-500">Πελάτες</div>
<div className="text-2xl font-bold">{clients.length}</div>
</div>

<div className="bg-white p-4 rounded-xl shadow">
<div className="text-sm text-gray-500">Έσοδα μήνα</div>
<div className="text-2xl font-bold text-green-600">
{totalIncome} €
</div>
</div>

<div className="bg-white p-4 rounded-xl shadow">
<div className="text-sm text-gray-500">Απλήρωτοι</div>
<div className="text-2xl font-bold text-red-500">
{clients.filter(c => c.payment_status === 'pending').length}
</div>
</div>

<div className="bg-white p-4 rounded-xl shadow">
<div className="text-sm text-gray-500">ΦΠΑ εκκρεμεί</div>
<div className="text-2xl font-bold text-orange-500">
{clients.filter(c => c.vat_enabled && !c.vat_submitted).length}
</div>
</div>

</div>
          <div className="text-xl font-semibold text-green-600">
            Σύνολο Εισπραγμένων: {totalIncome} €
          </div>
        </div>

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
              <input
                type="checkbox"
                checked={vatEnabled}
                onChange={e => setVatEnabled(e.target.checked)}
              />
              Έχει ΦΠΑ
            </label>
          </div>

          <textarea
            className="border p-2 rounded-lg w-full mt-4"
            placeholder="Παρατηρήσεις"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <button
            onClick={addClient}
            disabled={loading}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Προσθήκη..." : "Προσθήκη"}
          </button>
        </div>

<button
  onClick={createNewMonth}
  className="mb-4 bg-green-600 text-white px-4 py-2 rounded-xl"
>
  <button
  onClick={exportPDF}
  className="mb-4 ml-4 bg-blue-600 text-white px-4 py-2 rounded-xl"
>
  📄 Export PDF
</button>
  📅 Δημιουργία Μήνα
</button>
<input
  type="text"
  placeholder="🔎 Αναζήτηση πελάτη"
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="border p-2 rounded-lg mb-4 w-full"
/>
        <button
          onClick={() => setShowUnpaid(!showUnpaid)}
          className="mb-6 bg-gray-800 text-white px-4 py-2 rounded-xl"
        >
          {showUnpaid ? "Δείξε Όλους" : "Μόνο Απλήρωτοι"}
        </button>

        <div className="bg-white rounded-2xl shadow overflow-hidden">
  <table className="w-full">

    <thead className="bg-gray-100">
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
        <tr key={client.id} className="border-t">

          <td className="p-3 font-semibold">
            {client.name}
          </td>

          <td className="p-3">
            {client.afm}
          </td>

          <td className="p-3">
            {client.monthly_fee} €
          </td>

          <td className="p-3">
            {client.payment_status === 'paid'
              ? '✅'
              : '❌'}
          </td>

          <td className="p-3">
            {client.vat_enabled
              ? (client.vat_submitted ? '📤' : '⚠')
              : '-'}
          </td>

          <td className="p-3 space-x-3">

            <button
              onClick={() => togglePayment(client)}
              className="text-blue-600 text-sm"
            >
              Πληρωμή
            </button>

            {client.vat_enabled && (
              <button
                onClick={() => toggleVatSubmitted(client)}
                className="text-purple-600 text-sm"
              >
                ΦΠΑ
              </button>
            )}

            <button
              onClick={() => deleteClient(client.id)}
              className="text-red-600 text-sm"
            >
              Διαγραφή
            </button>

          </td>

        </tr>
      ))}

    </tbody>
  </table>
</div>
      </div>
    </div>
  )
}