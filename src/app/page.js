'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Home() {
  const [user, setUser] = useState(null)
  const [clients, setClients] = useState([])
  const [name, setName] = useState('')
  const [afm, setAfm] = useState('')
  const [fee, setFee] = useState('')
  const [vatEnabled, setVatEnabled] = useState(false)
  const [notes, setNotes] = useState('')
  const [showUnpaid, setShowUnpaid] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

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
        notes
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

  const filteredClients = showUnpaid
    ? clients.filter(c => c.payment_status === 'pending')
    : clients

  const totalIncome = clients
    .filter(c => c.payment_status === 'paid')
    .reduce((sum, c) => sum + Number(c.monthly_fee || 0), 0)

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
          <div className="text-xl font-semibold text-green-600">
            Σύνολο Εισπραγμένων: {totalIncome} €
          </div>
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
            <input className="border p-2 rounded-lg"
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
          onClick={() => setShowUnpaid(!showUnpaid)}
          className="mb-6 bg-gray-800 text-white px-4 py-2 rounded-xl"
        >
          {showUnpaid ? "Δείξε Όλους" : "Μόνο Απλήρωτοι"}
        </button>

        {/* Client Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-white p-6 rounded-2xl shadow">

              <h3 className="text-xl font-bold mb-2">{client.name}</h3>
              <p className="text-sm text-gray-500 mb-2">ΑΦΜ: {client.afm}</p>
              <p className="font-semibold mb-2">{client.monthly_fee} €</p>

              <p className="mb-2">
                {client.payment_status === 'paid'
                  ? '✅ Πληρώθηκε'
                  : '❌ Εκκρεμεί'}
              </p>

              <button
                onClick={() => togglePayment(client)}
                className="text-blue-600 text-sm mr-3"
              >
                Αλλαγή Πληρωμής
              </button>

              {client.vat_enabled && (
                <div className="mt-2">
                  <p>
                    {client.vat_submitted
                      ? '📤 ΦΠΑ Υποβλήθηκε'
                      : '⚠ ΦΠΑ Εκκρεμεί'}
                  </p>
                  <button
                    onClick={() => toggleVatSubmitted(client)}
                    className="text-purple-600 text-sm"
                  >
                    Αλλαγή ΦΠΑ
                  </button>
                </div>
              )}

              {client.notes && (
                <p className="mt-3 text-sm italic text-gray-600">
                  📝 {client.notes}
                </p>
              )}

              <button
                onClick={() => deleteClient(client.id)}
                className="mt-4 text-red-600 text-sm"
              >
                Διαγραφή
              </button>

            </div>
          ))}
        </div>

      </div>
    </div>
  )
}