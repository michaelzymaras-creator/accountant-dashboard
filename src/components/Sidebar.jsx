'use client'

import { supabase } from "../lib/supabase"
import Link from "next/link"

export default function Sidebar() {

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = "/login" // Σε στέλνει στο login μετά την αποσύνδεση
  }

  return (
    <aside className="w-64 bg-white shadow-lg p-6 flex flex-col h-screen sticky top-0">
      
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-blue-600 tracking-tight">
          TaxTick
        </h1>
        <p className="text-xs text-gray-400 font-medium">ACCOUNTING HUB</p>
      </div>

      <nav className="flex flex-col gap-2 text-sm flex-1">
        <Link href="/" className="p-3 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors text-left flex items-center gap-3">
          📊 Αρχική Σελίδα
        </Link>

        <button className="p-3 rounded-lg hover:bg-gray-100 text-left flex items-center gap-3 text-gray-600">
          👥 Πελάτες
        </button>

        <button className="p-3 rounded-lg hover:bg-gray-100 text-left flex items-center gap-3 text-gray-600">
          📄 Αναφορές
        </button>

        <button className="p-3 rounded-lg hover:bg-gray-100 text-left flex items-center gap-3 text-gray-600">
          ⚙ Ρυθμίσεις
        </button>
      </nav>

      {/* Κουμπί Αποσύνδεσης στο κάτω μέρος */}
      <div className="border-t pt-4">
        <button 
          onClick={handleLogout}
          className="p-3 w-full rounded-lg text-red-600 hover:bg-red-50 transition-colors text-left flex items-center gap-3 font-medium"
        >
          🚪 Αποσύνδεση
        </button>
      </div>

    </aside>
  )
}
