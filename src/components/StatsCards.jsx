export default function StatsCards({ totalClients, unpaidClients, totalIncome, vatDue }) {

return (

<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">

<div className="bg-white p-5 rounded-xl shadow">
<p className="text-gray-500 text-sm">Σύνολο Πελατών</p>
<h3 className="text-3xl font-bold">{totalClients}</h3>
</div>

<div className="bg-white p-5 rounded-xl shadow">
<p className="text-gray-500 text-sm">Απλήρωτοι</p>
<h3 className="text-3xl font-bold text-red-500">{unpaidClients}</h3>
</div>

<div className="bg-white p-5 rounded-xl shadow">
<p className="text-gray-500 text-sm">Έσοδα</p>
<h3 className="text-3xl font-bold text-green-600">{totalIncome} €</h3>
</div>

<div className="bg-white p-5 rounded-xl shadow">
<p className="text-gray-500 text-sm">ΦΠΑ προς υποβολή</p>
<h3 className="text-3xl font-bold text-orange-500">{vatDue}</h3>
</div>

</div>

)

}