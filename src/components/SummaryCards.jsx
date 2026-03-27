'use client'

export default function SummaryCards({ pendingVatCount, currentIncome, totalOfficeDebt, unpaidCount, overdueCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
      {/* ΦΠΑ */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-orange-100 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">ΦΠΑ Προς Υποβολή</p>
        <h4 className="text-4xl font-black text-orange-600">{pendingVatCount}</h4>
        <div className="absolute top-6 right-6 text-3xl opacity-20 group-hover:opacity-40 transition-opacity">⚠️</div>
      </div>
      
      {/* ΕΙΣΠΡΑΞΕΙΣ */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Είσπραξη / Οφειλές</p>
        <h4 className="text-4xl font-black text-slate-900">
          {currentIncome}€ <span className="text-sm text-red-500 font-bold ml-1 italic">/ {totalOfficeDebt}€</span>
        </h4>
        <div className="absolute top-6 right-6 text-3xl opacity-20 group-hover:opacity-40 transition-opacity">💰</div>
      </div>

      {/* ΕΚΚΡΕΜΟΤΗΤΕΣ */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Εκκρεμείς Πληρωμές</p>
        <h4 className="text-4xl font-black text-red-600">
          {unpaidCount} <span className="text-sm text-gray-400 font-bold ml-1 italic">({overdueCount} παλιά)</span>
        </h4>
        <div className="absolute top-6 right-6 text-3xl opacity-20 group-hover:opacity-40 transition-opacity">🚨</div>
      </div>
    </div>
  )
}
