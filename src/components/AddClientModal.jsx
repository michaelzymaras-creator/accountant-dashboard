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