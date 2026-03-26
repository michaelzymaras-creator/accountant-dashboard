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

const [sortField,setSortField]=useState("name")
const [sortDir,setSortDir]=useState("asc")

const [page,setPage]=useState(1)
const perPage=8

function sortData(field){
if(field===sortField){
setSortDir(sortDir==="asc"?"desc":"asc")
}else{
setSortField(field)
setSortDir("asc")
}
}

const sorted=[...clients].sort((a,b)=>{
const aVal=a[sortField] || ""
const bVal=b[sortField] || ""

if(sortDir==="asc"){
return aVal>bVal?1:-1
}else{
return aVal<bVal?1:-1
}
})

const totalPages=Math.ceil(sorted.length/perPage)

const paginated=sorted.slice(
(page-1)*perPage,
page*perPage
)

return(

<div className="bg-white rounded-xl shadow">

<div className="overflow-x-auto max-h-[500px]">

<table className="w-full text-sm">

<thead className="bg-gray-50 text-xs uppercase sticky top-0">

<tr>

<th
onClick={()=>sortData("name")}
className="p-4 text-left cursor-pointer"
>
Πελάτης
</th>

<th
onClick={()=>sortData("afm")}
className="p-4 text-left cursor-pointer"
>
ΑΦΜ
</th>

<th
onClick={()=>sortData("monthly_fee")}
className="p-4 text-left cursor-pointer"
>
Αμοιβή
</th>

<th className="p-4 text-left">
Πληρωμή
</th>

<th className="p-4 text-left">
ΦΠΑ
</th>

<th className="p-4 text-left">
Ενέργειες
</th>

</tr>

</thead>

<tbody>

{paginated.map(client=>(

<tr
key={client.id}
className="border-t hover:bg-gray-50"
>

<td className="p-4 font-medium">
{client.name}
{client.notes && (
    <span className="ml-2 text-gray-400 cursor-help" title={client.notes}>
      📝
    </span>
  )}
</td>

<td className="p-4">
{client.afm}
</td>

<td className="p-4">
{client.monthly_fee} €
</td>

<td className="p-4">

<span
className={`px-2 py-1 rounded text-xs font-semibold ${
client.payment_status==="paid"
?"bg-green-100 text-green-700"
:"bg-red-100 text-red-700"
}`}
>

{client.payment_status==="paid"
?"Πληρώθηκε"
:"Απλήρωτος"}

</span>

</td>

<td className="p-4">

{client.vat_enabled ? (

<div className="flex gap-2 text-xs">

<span>
{client.vat_type==="monthly"
?"Μηνιαίο"
:"Τριμηνιαίο"}
</span>

{client.vat_submitted ? (
<span className="text-green-600">
✓
</span>
):(
<span className="text-red-500">
!
</span>
)}

{getVatStatus(client)==="due" &&
!client.vat_submitted &&(
<span className="text-orange-600">
⚠
</span>
)}

</div>

):(

<span className="text-gray-400 text-xs">
-
</span>

)}

</td>

<td className="p-4 flex gap-2">

<button
onClick={()=>togglePayment(client)}
className="px-2 py-1 text-xs rounded bg-blue-600 text-white"
>
Πληρωμή
</button>

<button
onClick={()=>setEditingClient(client)}
className="px-2 py-1 text-xs rounded bg-gray-200"
>
Edit
</button>

<button
onClick={()=>deleteClient(client.id)}
className="px-2 py-1 text-xs rounded bg-red-600 text-white"
>
Delete
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

{/* PAGINATION */}

<div className="flex justify-between items-center p-4 text-sm">

<p>
Σελίδα {page} / {totalPages}
</p>

<div className="flex gap-2">

<button
onClick={()=>setPage(page-1)}
disabled={page===1}
className="px-3 py-1 border rounded"
>
Prev
</button>

<button
onClick={()=>setPage(page+1)}
disabled={page===totalPages}
className="px-3 py-1 border rounded"
>
Next
</button>

</div>

</div>

</div>

)

}