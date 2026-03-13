'use client'

import { supabase } from "../lib/supabase" 
import { useState } from "react"

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import StatsCards from "../components/StatsCards"
import ClientsTable from "../components/ClientsTable"
import { useEffect } from "react"

export default function Home(){

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
.eq("month",selectedMonth)
.order("created_at",{ascending:false})

if(data){
setClients(data)
}

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