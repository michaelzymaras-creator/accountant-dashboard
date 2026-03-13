'use client'

import { useState } from "react"

import Sidebar from "../components/Sidebar"
import Header from "../components/Header"
import StatsCards from "../components/StatsCards"
import ClientsTable from "../components/ClientsTable"

export default function Home(){

const [selectedMonth,setSelectedMonth]=useState("2025-03")

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
totalClients={10}
unpaidClients={3}
totalIncome={1200}
vatDue={2}
/>

</div>

</main>

</div>

)

}