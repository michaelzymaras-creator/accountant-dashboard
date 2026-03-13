export default function ClientsTable({
  clients,
  togglePayment,
  toggleVatSubmitted,
  deleteClient,
  setEditingClient,
  getVatStatus
}) {

return (

<div className="bg-white rounded-xl shadow overflow-hidden">

<ClientsTable
clients={filteredClients}
togglePayment={togglePayment}
toggleVatSubmitted={toggleVatSubmitted}
deleteClient={deleteClient}
setEditingClient={setEditingClient}
getVatStatus={getVatStatus}
/>

</div>

)

}