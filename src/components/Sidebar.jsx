// components/Sidebar.jsx
'use client'
import { useState } from "react" // <--- Προσθήκη
import { supabase } from "../lib/supabase"
import Link from "next/link"

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false); // State για το κινητό

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  return (
    <>
      {/* Κουμπί Hamburger (Φαίνεται μόνο σε κινητά) */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-5 left-5 z-[110] bg-blue-600 text-white p-2 rounded-lg shadow-lg"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Overlay για να κλείνει το μενού πατώντας έξω */}
      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] md:hidden"></div>
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-64 bg-white shadow-lg p-6 flex flex-col h-screen transition-transform duration-300
        md:sticky md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="mb-10 mt-8 md:mt-0">
          <h1 className="text-3xl font-black text-blue-600 tracking-tight italic">TaxTick</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ACCOUNTING HUB</p>
        </div>

        <nav className="flex flex-col gap-2 text-[11px] font-black uppercase tracking-widest flex-1">
          <Link href="/" className="p-4 rounded-xl bg-blue-50 text-blue-600 flex items-center gap-3">📊 ΑΡΧΙΚΗ</Link>
          <button className="p-4 rounded-xl hover:bg-gray-50 text-left flex items-center gap-3 text-slate-500">👥 ΠΕΛΑΤΕΣ</button>
          <button className="p-4 rounded-xl hover:bg-gray-50 text-left flex items-center gap-3 text-slate-500">📄 ΑΝΑΦΟΡΕΣ</button>
        </nav>

        <div className="border-t pt-4">
          <button onClick={handleLogout} className="p-4 w-full rounded-xl text-red-600 hover:bg-red-50 transition-colors text-left flex items-center gap-3 font-black text-[11px] uppercase">
            🚪 ΑΠΟΣΥΝΔΕΣΗ
          </button>
        </div>
      </aside>
    </>
  )
}
