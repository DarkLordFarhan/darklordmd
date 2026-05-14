const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} = require("@whiskeysockets/baileys")

const express = require("express")
const fs = require("fs")
const path = require("path")
const P = require("pino")

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

console.log(`
╔══════════════════════════════╗
║      DARKLORDMD V5.7        ║
║   DarkLordFarhan Official   ║
╚══════════════════════════════╝
`)

let sock = null

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session")
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" }))
    },
    logger: P({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    markOnlineOnConnect: true
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, pairingCode } = update

    if (pairingCode) {
      console.log("🔑 Pairing Code:", pairingCode)
    }

    if (connection === "open") {
      console.log("✅ WhatsApp Connected Successfully!")
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      console.log("❌ Connection Closed. Code:", statusCode)
      if (shouldReconnect) {
        console.log("🔄 Reconnecting...")
        setTimeout(startBot, 3000)
      } else {
        console.log("🚪 Logged out — delete ./session to re-pair")
      }
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0]
    if (!m.message || m.key.fromMe) return
    const from = m.key.remoteJid
    const body = m.message.conversation || m.message.extendedTextMessage?.text || ""
    const cmd = body.trim().split(" ")[0].toLowerCase()

    if (cmd === ".menu") {
      await sock.sendMessage(from, {
        image: fs.readFileSync("./darklord-logo.png"),
        caption: "🔥 *DARKLORDMD V5.7* 🔥\n━━━━━━━━━━━━━━━━━━\n.menu  — Show this menu\n.ping  — Check latency\n.alive — Bot status\n.owner — Owner info\n.time  — Current time\n.help  — Help guide\n━━━━━━━━━━━━━━━━━━"
      })
    } else if (cmd === ".ping") {
      const start = Date.now()
      await sock.sendMessage(from, { text: `🏓 Pong! ${Date.now() - start}ms` })
    } else if (cmd === ".alive") {
      await sock.sendMessage(from, { text: "✅ *DarklordMD* is Online and Kicking! 🔥" })
    } else if (cmd === ".owner") {
      await sock.sendMessage(from, { text: "👑 *Owner:* DarkLord Farhan\n📱 +254795463911" })
    } else if (cmd === ".time") {
      await sock.sendMessage(from, { text: `🕐 ${new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}` })
    } else if (cmd === ".help") {
      await sock.sendMessage(from, { text: "ℹ️ Type *.menu* to see all commands." })
    }
  })
}

// API: Request Pairing Code
app.post("/api/pair", async (req, res) => {
  try {
    let { number } = req.body
    if (!number) return res.status(400).json({ success: false, error: "Phone number is required." })
    number = number.replace(/[^0-9]/g, "")
    if (number.length < 7 || number.length > 15) return res.status(400).json({ success: false, error: "Invalid phone number format." })
    if (!sock) return res.status(503).json({ success: false, error: "Bot not ready yet. Please wait a moment." })

    const code = await sock.requestPairingCode(number)
    console.log(`📲 Pair request — number: ${number}, code: ${code}`)

    // Send WhatsApp notification
    try {
      const jid = `${number}@s.whatsapp.net`
      await sock.sendMessage(jid, {
        text: `🔐 *DarklordMD Pairing*\n\nYour link code is:\n\n*${code}*\n\n━━━━━━━━━━━━━━\nOpen WhatsApp → Linked Devices → Link a Device → *Enter Code*\n\nThis code expires in a few minutes.\nPowered by *DarklordMD V5.7* 🔥`
      })
    } catch (_) { /* best-effort */ }

    return res.json({ success: true, code })
  } catch (err) {
    console.error("Pair error:", err)
    return res.status(500).json({ success: false, error: "Failed to generate pairing code. Make sure the bot is connected." })
  }
})

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.listen(PORT, () => {
  console.log(`🌐 Web Server → http://localhost:${PORT}`)
})

startBot()
