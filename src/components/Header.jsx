export default function Header({selectedMonth,setSelectedMonth}) {

return (

<div className="flex justify-between items-center mb-10">

<div>
<h2 className="text-xl font-semibold">
Αρχική Σελίδα
</h2>

<p className="text-gray-500 text-sm">
Διαχείριση πελατών
</p>

</div>

<input
type="month"
value={selectedMonth}
onChange={(e)=>setSelectedMonth(e.target.value)}
className="border p-2 rounded-lg"
/>

</div>

)

}