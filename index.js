
const {
 default: makeWASocket,
 useMultiFileAuthState,
 DisconnectReason,
 fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

const express = require("express")
const fs = require("fs")
const P = require("pino")

const app = express()
const PORT = process.env.PORT || 3000

console.log(`
╔══════════════════════════════╗
║      DARKLORDMD V5.7        ║
║   DarkLordFarhan Official   ║
╚══════════════════════════════╝
`)

let sock

async function startBot() {

 const { state, saveCreds } = await useMultiFileAuthState("./session")
 const { version } = await fetchLatestBaileysVersion()

 sock = makeWASocket({
   version,
   auth: state,
   logger: P({ level: "silent" }),
   browser: ["DarklordMD","Chrome","1.0.0"]
 })

 sock.ev.on("creds.update", saveCreds)

 sock.ev.on("connection.update", async(update) => {
   const { connection, lastDisconnect } = update

   if(update.pairingCode){
      console.log("🔑 Pairing Code:", update.pairingCode)
   }

   if(connection === "open"){
      console.log("✅ WhatsApp Connected Successfully")
      console.log("📲 Notifications for new linking codes enabled")
   }

   if(connection === "close"){
      const shouldReconnect =
       lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      console.log("❌ Connection Closed")

      if(shouldReconnect){
        startBot()
      }
   }
 })

 sock.ev.on("messages.upsert", async({ messages }) => {
   const m = messages[0]
   if(!m.message || m.key.fromMe) return

   const from = m.key.remoteJid
   const body =
      m.message.conversation ||
      m.message.extendedTextMessage?.text ||
      ""

   const cmd = body.trim().split(" ")[0].toLowerCase()

   if(cmd === ".menu"){
      await sock.sendMessage(from,{
         image: fs.readFileSync("./darklord-logo.png"),
         caption:
`🔥 DARKLORDMD V5.7 🔥

.menu
.ping
.alive
.owner
.time
.help`
      })
   }

   if(cmd === ".ping"){
      await sock.sendMessage(from,{ text:"🏓 Pong!" })
   }

   if(cmd === ".alive"){
      await sock.sendMessage(from,{ text:"✅ DarklordMD Online" })
   }

   if(cmd === ".owner"){
      await sock.sendMessage(from,{ text:"👑 DarkLord Farhan\n📱 +254795463911" })
   }

   if(cmd === ".time"){
      await sock.sendMessage(from,{ text:new Date().toLocaleString() })
   }

   if(cmd === ".help"){
      await sock.sendMessage(from,{ text:"Use .menu" })
   }
 })

}

app.get("/",(req,res)=>{
 res.send("DarklordMD Pairing Server Running")
})

app.get("/pair", async(req,res)=>{
 try{
   const number = req.query.number

   if(!number){
      return res.send("Use /pair?number=2547XXXXXXXX")
   }

   const code = await sock.requestPairingCode(number)

   console.log("📲 NEW PAIR REQUEST FOR:", number)
   console.log("🔑 CODE:", code)

   res.send(`
      <center>
      <h1>DARKLORDMD PAIRING</h1>
      <img src="https://i.imgur.com/8Km9tLL.png" width="120"/>
      <h2>${code}</h2>
      </center>
   `)
 }catch(e){
   console.log(e)
   res.send("Error generating pairing code")
 }
})

app.listen(PORT,()=>{
 console.log("🌐 Server Running On Port " + PORT)
})

startBot()
