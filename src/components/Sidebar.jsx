export default function Sidebar() {

return (

<aside className="w-64 bg-white shadow-lg p-6 flex flex-col">

<h1 className="text-3xl mb-10 font-semibold">
TaxTick
</h1>

<nav className="flex flex-col gap-2 text-sm">

<button className="p-3 rounded-lg hover:bg-gray-100 text-left">
📊 Dashboard
</button>

<button className="p-3 rounded-lg hover:bg-gray-100 text-left">
👥 Clients
</button>

<button className="p-3 rounded-lg hover:bg-gray-100 text-left">
📄 Reports
</button>

<button className="p-3 rounded-lg hover:bg-gray-100 text-left">
⚙ Settings
</button>

</nav>

</aside>

)

}