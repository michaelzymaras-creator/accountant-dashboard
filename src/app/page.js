'use client'

import { useState } from "react"

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import StatsCards from "../components/StatsCards"
import ClientsTable from "../components/ClientsTable"

export default function Home(){

const [selectedMonth,setSelectedMonth]=useState("2025-03")

// προσωρινο fake data
const clients=[
{
id:1,
name:"Client A",
afm:"123456789",
monthly_fee:100,
payment_status:"pending",
vat_enabled:true,
vat_submitted:false,
vat_type:"monthly"
},
{
id:2,
name:"Client B",
afm:"987654321",
monthly_fee:200,
payment_status:"paid",
vat_enabled:false
}
]

function togglePayment(client){
console.log("toggle payment",client)
}

function toggleVatSubmitted(client){
console.log("toggle vat",client)
}

function deleteClient(id){
console.log("delete",id)
}

function getVatStatus(){
return "ok"
}

return(

<div className="min-h-screen flex bg-[#F9F7F2]">

<Sidebar/>

<main className="flex-1 p-8">

<div className="max-w-7xl mx-auto">

<Header
selectedMonth={selectedMonth}
setSelectedMonth={setSelectedMonth}
/>

<StatsCards
totalClients={clients.length}
unpaidClients={clients.filter(c=>c.payment_status==="pending").length}
totalIncome={300}
vatDue={1}
/>

<ClientsTable
clients={clients}
togglePayment={togglePayment}
toggleVatSubmitted={toggleVatSubmitted}
deleteClient={deleteClient}
setEditingClient={()=>{}}
getVatStatus={getVatStatus}
/>

</div>

</main>

</div>

)

}