// components/Header.jsx
export default function Header({selectedMonth, setSelectedMonth}) {
  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">
          Αρχική Σελίδα
        </h2>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
          Διαχείριση πελατών & ΦΠΑ
        </p>
      </div>

      <input
        type="month"
        value={selectedMonth}
        onChange={(e)=>setSelectedMonth(e.target.value)}
        className="border-2 border-gray-100 p-3 rounded-2xl font-black text-sm text-slate-700 outline-none focus:border-blue-600 transition-all bg-white shadow-sm"
      />
    </div>
  )
}
