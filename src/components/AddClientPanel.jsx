'use client'

export default function AddClientPanel({ 
  isOpen, onClose, onAdd, 
  name, setName, afm, setAfm, fee, setFee, vatType, setVatType 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl p-10 flex flex-col border-l border-gray-100 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-start mb-10">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic underline decoration-blue-600">Νέος Πελάτης</h2>
            <button onClick={onClose} className="text-gray-300 hover:text-slate-900 text-3xl font-black transition-colors">×</button>
          </div>
          
          <div className="space-y-8 flex-1">
            <div className="group">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-focus-within:text-blue-600 transition-colors">Ονοματεπώνυμο</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full border-b-2 border-gray-100 p-3 text-lg font-bold text-slate-900 outline-none focus:border-blue-600 transition-all bg-transparent" placeholder="π.χ. Ιωάννης Παπαδόπουλος" />
            </div>
            
            <div className="group">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-focus-within:text-blue-600 transition-colors">Αριθμός Φορολογικού Μητρώου (ΑΦΜ)</label>
              <input value={afm} onChange={e => setAfm(e.target.value)} className="w-full border-b-2 border-gray-100 p-3 text-lg font-bold text-slate-900 outline-none focus:border-blue-600 transition-all bg-transparent" placeholder="9 ψηφία" />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-focus-within:text-blue-600 transition-colors">Μηνιαία Αμοιβή (€)</label>
                <input type="number" value={fee} onChange={e => setFee(e.target.value)} className="w-full border-b-2 border-gray-100 p-3 text-lg font-bold text-slate-900 outline-none focus:border-blue-600 transition-all bg-transparent" placeholder="0.00" />
              </div>
              <div className="group">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Καθεστώς ΦΠΑ</label>
                <select value={vatType} onChange={e => setVatType(e.target.value)} className="w-full border-b-2 border-gray-100 p-3 text-sm font-black text-slate-900 outline-none focus:border-blue-600 transition-all bg-white cursor-pointer">
                  <option value="monthly">ΜΗΝΙΑΙΟ</option>
                  <option value="quarterly">ΤΡΙΜΗΝΙΑΙΟ</option>
                  <option value="none">ΧΩΡΙΣ ΦΠΑ</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-10">
            <button onClick={onAdd} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95">
              Καταχώρηση Πελάτη
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
