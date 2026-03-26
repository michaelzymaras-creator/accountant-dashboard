'use client'
import { useState } from "react"

export default function ClientsTable({
  clients,
  togglePayment,
  toggleVatSubmitted,
  deleteClient,
  setEditingClient,
  getVatStatus // Αυτό είναι το σωστό prop από το page.js
}){

  const [sortField, setSortField] = useState("name")
  const [sortDir, setSortDir] = useState("asc")
  const [page, setPage] = useState(1)
  const perPage = 8

  function sortData(field){
    if(field === sortField){
      setSortDir(sortDir === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const sorted = [...clients].sort((a, b) => {
    const aVal = a[sortField] || ""
    const bVal = b[sortField] || ""
    return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
  })

  const totalPages = Math.ceil(sorted.length / perPage)
  const paginated = sorted.slice((page - 1) * perPage, page * perPage)

  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-900">
          <thead className="bg-gray-100 text-xs uppercase font-bold text-slate-700 border-b">
            <tr>
              <th onClick={() => sortData("name")} className="p-4 text-left cursor-pointer">Πελάτης</th>
              <th onClick={() => sortData("afm")} className="p-4 text-left cursor-pointer">ΑΦΜ</th>
              <th onClick={() => sortData("monthly_fee")} className="p-4 text-left cursor-pointer">Αμοιβή</th>
              <th className="p-4 text-center">Κατάσταση ΦΠΑ</th>
              <th className="p-4 text-left">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(client => {
              const vatInfo = getVatStatus(client); // Χρήση της συνάρτησης που περνάμε από το page.js
              return (
                <tr key={client.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold text-slate-900">
                    {client.name}
                    {client.notes && <span title={client.notes} className="ml-2 cursor-help">📝</span>}
                  </td>
                  <td className="p-4 text-slate-700">{client.afm}</td>
                  <td className="p-4 font-semibold text-slate-900">{client.monthly_fee} €</td>
                  
                  <td className="p-4">
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] font-black uppercase ${vatInfo.status === "due" ? "text-black-600" : "text-gray-400"}`}>
                        {vatInfo.label}
                      </span>
                      {client.vat_enabled ? (
                        <span className={`text-lg font-bold ${client.vat_submitted ? "text-green-600" : "text-red-600"}`}>
                          {client.vat_submitted ? "✓" : "!"}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </div>
                  </td>

                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => togglePayment(client)}
                      className={`px-3 py-1 text-xs rounded font-bold transition ${
                        client.payment_status === "paid" ? "bg-green-600 text-white" : "bg-blue-600 text-white"
                      }`}
                    >
                      {client.payment_status === "paid" ? "Πληρώθηκε" : "Πληρωμή"}
                    </button>

                    {client.vat_enabled && (
                      <button
                        onClick={() => toggleVatSubmitted(client)}
                        className={`px-3 py-1 text-xs rounded font-bold transition ${
                          client.vat_submitted ? "bg-green-600 text-white" : "bg-orange-500 text-white"
                        }`}
                      >
                        {client.vat_submitted ? "ΦΠΑ ✓" : "ΦΠΑ !"}
                      </button>
                    )}

                    <button onClick={() => setEditingClient(client)} className="px-3 py-1 text-xs rounded bg-gray-200 font-bold hover:bg-gray-300">Edit</button>
                    <button onClick={() => deleteClient(client.id)} className="px-3 py-1 text-xs rounded bg-red-600 text-white font-bold hover:bg-red-700">Delete</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center p-4 text-sm font-bold text-slate-700 border-t bg-gray-50">
        <p>Σελίδα {page} / {totalPages || 1}</p>
        <div className="flex gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-3 py-1 border rounded bg-white disabled:opacity-50">Prev</button>
          <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-3 py-1 border rounded bg-white disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  )
}
