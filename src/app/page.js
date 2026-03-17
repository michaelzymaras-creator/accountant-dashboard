'use client'

import { supabase } from "../lib/supabase" 
import { useState } from "react"

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import StatsCards from "../components/StatsCards"
import ClientsTable from "../components/ClientsTable"
import { useEffect } from "react"

export default function Home(){

const [name,setName]=useState("")
const [afm,setAfm]=useState("")
const [fee,setFee]=useState("") 

console.log("USER:", user)

async function addClient(){

if(!user){
alert("Δεν έχει γίνει login ακόμα")
return
}

if(!name) return alert("Βάλε όνομα")

const { data, error } = await supabase
.from("clients")
.insert([{
user_id: user.id,
name,
afm,
monthly_fee: fee,
payment_status: "pending"
}])
.select()

if(error){
console.log(error)
alert(error.message)
return
}

setClients([data[0], ...clients])

setName("")
setAfm("")
setFee("")
}

const [selectedMonth,setSelectedMonth]=useState("2025-03")
const [clients,setClients]=useState([])
const [user,setUser]=useState(null)

useEffect(()=>{
    checkUser()
},[])

async function checkUser(){

const { data } = await supabase.auth.getUser()

if(data.user){
setUser(data.user)
fetchClients(data.user.id)
}

}

async function fetchClients(userId){

const { data } = await supabase
.from("clients")
.select("*")
.eq("user_id",userId)
// .eq("month",selectedMonth) 
.order("created_at",{ascending:false})

if(data){
setClients(data)
}

console.log("DATA:", data)

}

useEffect(()=>{

if(user){
fetchClients(user.id)
}

},[selectedMonth])


function togglePayment(client){
console.log("toggle payment",client)
}

function toggleVatSubmitted(client){
console.log("toggle vat",client)
}

function deleteClient(id){
console.log("delete",id)
}

function getVatStatus(client){
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

unpaidClients={
clients.filter(c=>c.payment_status==="pending").length
}

totalIncome={
clients
.filter(c=>c.payment_status==="paid")
.reduce((sum,c)=>sum+Number(c.monthly_fee||0),0)
}
/>

<div className="bg-white p-4 rounded-xl shadow mb-6">

<h3 className="mb-3 font-semibold">Νέος Πελάτης</h3>

<div className="flex gap-2">

<input
placeholder="Όνομα"
value={name}
onChange={e=>setName(e.target.value)}
className="border p-2 rounded"
/>

<input
placeholder="ΑΦΜ"
value={afm}
onChange={e=>setAfm(e.target.value)}
className="border p-2 rounded"
/>

<input
placeholder="Αμοιβή"
value={fee}
onChange={e=>setFee(e.target.value)}
className="border p-2 rounded"
/>

<button
onClick={addClient}
className="bg-blue-600 text-white px-4 rounded"
>
Προσθήκη
</button>

</div>

</div>

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