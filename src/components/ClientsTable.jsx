'use client'
import { useState } from "react"

export default function ClientsTable({
  clients,
  togglePayment,
  toggleVatSubmitted,
  deleteClient,
  setEditingClient,
  getVatStatus
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
          <thead className="bg-gray-100 text-xs uppercase font-black text-slate-700 border-b tracking-tighter">
            <tr>
              <th onClick={() => sortData("name")} className="p-4 text-left cursor-pointer">Πελάτης</th>
              <th onClick={() => sortData("afm")} className="p-4 text-left cursor-pointer">ΑΦΜ</th>
              <th onClick={() => sortData("monthly_fee")} className="p-4 text-left cursor-pointer">Αμοιβή / Χρέος</th>
              <th className="p-4 text-center">Κατάσταση ΦΠΑ</th>
              <th className="p-4 text-left">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(client => {
              const vatInfo = getVatStatus(client); 
              const isPaid = client.payment_status === "paid";
              const isVatDone = client.vat_submitted;
              const hasPrevDebt = Number(client.previous_debt) > 0;
              
              return (
                <tr key={client.id} className={`border-t transition-colors ${isPaid && isVatDone ? "bg-green-50/40" : "hover:bg-gray-50"}`}>
                  
                  <td className="p-4 font-black text-slate-900 uppercase tracking-tighter">
                    {client.name}
                    {client.notes && <span title={client.notes} className="ml-2 cursor-help text-lg no-underline inline-block">📝</span>}
                  </td>

                  <td className="p-4 text-slate-600 font-bold italic">
                    {client.afm}
                  </td>

                  {/* ΑΜΟΙΒΗ + ΠΑΛΙΟ ΧΡΕΟΣ */}
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className={`font-black text-sm transition-all ${isPaid ? "text-gray-300 line-through decoration-gray-400 decoration-2" : "text-slate-900"}`}>
                        {client.monthly_fee} €
                      </span>
                      {hasPrevDebt && (
                        <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-1 py-0.5 rounded w-fit mt-1 uppercase tracking-tighter">
                          + {client.previous_debt} € Παλιό Χρέος
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="flex flex-col items-center min-h-[40px] justify-center">
                      <span className={`text-[9px] font-black uppercase mb-1 transition-all ${
                        vatInfo.status === "due" 
                          ? (isVatDone ? "text-gray-300 line-through" : "text-orange-600") 
                          : "text-gray-300"
                      }`}>
                        {vatInfo.label}
                      </span>
                      
                      {client.vat_enabled && vatInfo.status === "due" ? (
                        <span className={`text-xl font-black ${isVatDone ? "text-green-600" : "text-red-600"}`}>
                          {isVatDone ? "✓" : "!"}
                        </span>
                      ) : (
                        <span className="text-gray-200">-</span>
                      )}
                    </div>
                  </td>

                  <td className="p-4 flex gap-2">
                    <button
                      onClick={() => togglePayment(client)}
                      className={`px-3 py-1.5 text-[10px] rounded font-black transition shadow-sm border ${
                        isPaid ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                      }`}
                    >
                      {isPaid ? "ΠΛΗΡΩΘΗΚΕ" : "ΠΛΗΡΩΜΗ"}
                    </button>

                    {client.vat_enabled && vatInfo.status === "due" && (
                      <button
                        onClick={() => toggleVatSubmitted(client)}
                        className={`px-3 py-1.5 text-[10px] rounded font-black transition shadow-sm border ${
                          isVatDone ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-orange-500 text-white border-orange-600 hover:bg-orange-600"
                        }`}
                      >
                        {isVatDone ? "ΦΠΑ ✓" : "ΦΠΑ !"}
                      </button>
                    )}

                    <button onClick={() => setEditingClient(client)} className="px-3 py-1.5 text-[10px] rounded bg-white border border-gray-300 font-black hover:bg-gray-100 text-slate-700">EDIT</button>
                    <button onClick={() => deleteClient(client.id)} className="px-3 py-1.5 text-[10px] rounded bg-white border border-red-100 text-red-500 font-black hover:bg-red-600 hover:text-white">DEL</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center p-4 text-[10px] font-black text-slate-500 border-t bg-gray-50 uppercase tracking-widest">
        <p>Σελίδα {page} / {totalPages || 1}</p>
        <div className="flex gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page === 1} className="px-4 py-1.5 border border-gray-300 rounded bg-white disabled:opacity-30 shadow-sm text-slate-900">Πίσω</button>
          <button onClick={() => setPage(page + 1)} disabled={page === totalPages} className="px-4 py-1.5 border border-gray-300 rounded bg-white disabled:opacity-30 shadow-sm text-slate-900">Επόμενο</button>
        </div>
      </div>
    </div>
  )
}
