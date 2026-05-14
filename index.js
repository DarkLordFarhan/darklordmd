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



// Serve pairing site inline — no public/ folder needed
app.get("*", (req, res) => {
  res.setHeader("Content-Type", "text/html")
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>DarklordMD — Pairing Portal</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600&display=swap" rel="stylesheet"/>
<style>
  :root {
    --green: #00ff88;
    --green-dim: #00cc6a;
    --green-glow: rgba(0,255,136,0.4);
    --red: #ff3366;
    --bg: #050a05;
    --surface: #0a140a;
    --border: rgba(0,255,136,0.18);
    --text: #c8ffd8;
    --muted: #4a7a5a;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Rajdhani', sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
  }

  /* ── Animated grid background ── */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,255,136,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,255,136,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    z-index: 0;
    pointer-events: none;
  }

  /* ── Scanlines ── */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.15) 2px,
      rgba(0,0,0,0.15) 4px
    );
    z-index: 0;
    pointer-events: none;
    animation: scanlines 8s linear infinite;
  }

  @keyframes scanlines {
    0% { background-position: 0 0; }
    100% { background-position: 0 400px; }
  }

  .wrapper {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    gap: 2rem;
  }

  /* ── Header ── */
  header {
    text-align: center;
    animation: fadeDown 0.8s ease both;
  }

  .logo-ring {
    width: 110px;
    height: 110px;
    border-radius: 50%;
    border: 2px solid var(--green);
    box-shadow: 0 0 30px var(--green-glow), inset 0 0 30px rgba(0,255,136,0.05);
    margin: 0 auto 1.4rem;
    padding: 8px;
    position: relative;
    animation: pulse-ring 3s ease-in-out infinite;
  }

  @keyframes pulse-ring {
    0%, 100% { box-shadow: 0 0 20px var(--green-glow), inset 0 0 20px rgba(0,255,136,0.05); }
    50%       { box-shadow: 0 0 50px var(--green-glow), inset 0 0 40px rgba(0,255,136,0.12); }
  }

  .logo-ring img {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    filter: hue-rotate(0deg) brightness(0.9);
  }

  /* spinning corners */
  .logo-ring::before, .logo-ring::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid transparent;
    border-top-color: var(--green);
    border-right-color: var(--green);
    animation: spin 3s linear infinite;
  }
  .logo-ring::after { animation-direction: reverse; animation-duration: 4s; opacity: 0.4; }

  @keyframes spin { to { transform: rotate(360deg); } }

  h1 {
    font-family: 'Orbitron', monospace;
    font-size: clamp(1.6rem, 5vw, 2.8rem);
    font-weight: 900;
    letter-spacing: 0.1em;
    color: var(--green);
    text-shadow: 0 0 20px var(--green-glow), 0 0 60px rgba(0,255,136,0.2);
    margin-bottom: 0.3rem;
  }

  .tagline {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.75rem;
    color: var(--muted);
    letter-spacing: 0.25em;
    text-transform: uppercase;
  }

  .version-badge {
    display: inline-block;
    margin-top: 0.6rem;
    padding: 2px 10px;
    border: 1px solid var(--green);
    border-radius: 2px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.7rem;
    color: var(--green);
    letter-spacing: 0.2em;
    background: rgba(0,255,136,0.05);
  }

  /* ── Card ── */
  .card {
    width: 100%;
    max-width: 480px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2rem;
    position: relative;
    overflow: hidden;
    animation: fadeUp 0.9s 0.2s ease both;
  }

  /* corner decorators */
  .card::before, .card::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    border-color: var(--green);
    border-style: solid;
  }
  .card::before { top: -1px; left: -1px; border-width: 2px 0 0 2px; }
  .card::after  { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }

  .card-title {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.65rem;
    color: var(--muted);
    letter-spacing: 0.3em;
    text-transform: uppercase;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── Input group ── */
  .input-group {
    margin-bottom: 1.2rem;
  }

  label {
    display: block;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.7rem;
    color: var(--muted);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .phone-wrap {
    display: flex;
    align-items: stretch;
    border: 1px solid var(--border);
    border-radius: 2px;
    background: rgba(0,255,136,0.02);
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .phone-wrap:focus-within {
    border-color: var(--green);
    box-shadow: 0 0 12px rgba(0,255,136,0.15);
  }

  .phone-prefix {
    padding: 0 12px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.9rem;
    color: var(--green);
    display: flex;
    align-items: center;
    border-right: 1px solid var(--border);
    white-space: nowrap;
    user-select: none;
  }

  input[type="tel"] {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    padding: 0.85rem 1rem;
    font-family: 'Share Tech Mono', monospace;
    font-size: 1rem;
    color: var(--text);
    width: 100%;
  }

  input[type="tel"]::placeholder { color: #2a4a3a; }

  /* ── Button ── */
  .btn {
    width: 100%;
    padding: 0.9rem 1.5rem;
    background: transparent;
    border: 1px solid var(--green);
    color: var(--green);
    font-family: 'Orbitron', monospace;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
    transition: color 0.3s, box-shadow 0.3s;
  }

  .btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--green);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
    z-index: -1;
  }

  .btn:hover::before { transform: scaleX(1); }
  .btn:hover { color: #050a05; box-shadow: 0 0 20px var(--green-glow); }
  .btn:active { transform: scale(0.98); }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn:disabled::before { display: none; }

  /* ── Loader dots ── */
  .dots { display: inline-flex; gap: 4px; align-items: center; }
  .dots span {
    width: 5px; height: 5px;
    background: currentColor;
    border-radius: 50%;
    animation: dot-bounce 1.2s ease-in-out infinite;
  }
  .dots span:nth-child(2) { animation-delay: 0.2s; }
  .dots span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes dot-bounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  /* ── Result box ── */
  #result {
    margin-top: 1.4rem;
    display: none;
    animation: fadeUp 0.5s ease both;
  }

  .result-inner {
    border: 1px solid var(--green);
    border-radius: 2px;
    padding: 1.4rem;
    background: rgba(0,255,136,0.04);
    position: relative;
    text-align: center;
  }

  .result-inner::before {
    content: '[ PAIRING CODE ]';
    position: absolute;
    top: -0.6em;
    left: 50%;
    transform: translateX(-50%);
    background: var(--surface);
    padding: 0 8px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.6rem;
    color: var(--green);
    letter-spacing: 0.2em;
    white-space: nowrap;
  }

  .code-display {
    font-family: 'Orbitron', monospace;
    font-size: clamp(2rem, 8vw, 3.2rem);
    font-weight: 900;
    color: var(--green);
    letter-spacing: 0.3em;
    text-shadow: 0 0 30px var(--green-glow);
    margin: 0.6rem 0 1rem;
    animation: code-flicker 0.1s ease 0s 2;
  }

  @keyframes code-flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .steps {
    list-style: none;
    text-align: left;
    font-size: 0.88rem;
    color: var(--muted);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .steps li { display: flex; align-items: flex-start; gap: 8px; }
  .steps li::before {
    content: '›';
    color: var(--green);
    font-weight: 700;
    flex-shrink: 0;
  }

  .wa-note {
    margin-top: 1rem;
    padding: 0.7rem;
    border: 1px solid rgba(0,255,136,0.15);
    border-radius: 2px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.68rem;
    color: #3a6a4a;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .wa-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--green);
    flex-shrink: 0;
    box-shadow: 0 0 6px var(--green);
    animation: blink 1.5s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  /* ── Error ── */
  #error-msg {
    margin-top: 1rem;
    display: none;
    padding: 0.75rem 1rem;
    border: 1px solid var(--red);
    border-radius: 2px;
    background: rgba(255,51,102,0.07);
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.75rem;
    color: var(--red);
    letter-spacing: 0.05em;
    animation: fadeUp 0.3s ease both;
  }

  /* ── Footer status ── */
  .status-bar {
    font-family: 'Share Tech Mono', monospace;
    font-size: 0.65rem;
    color: var(--muted);
    letter-spacing: 0.15em;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    animation: fadeUp 1s 0.5s ease both;
  }
  .status-bar .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 6px var(--green);
    animation: blink 2s infinite;
  }

  /* ── Animations ── */
  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Responsive ── */
  @media (max-width: 520px) {
    .card { padding: 1.4rem; }
  }
</style>
</head>
<body>
<div class="wrapper">

  <header>
    <div class="logo-ring">
      <img src="/darklord-logo.png" alt="DarklordMD Logo" onerror="this.style.display='none'"/>
    </div>
    <h1>DARKLORDMD</h1>
    <div class="tagline">WhatsApp Bot Pairing Portal</div>
    <span class="version-badge">V5.7.1 // BAILEYS</span>
  </header>

  <div class="card">
    <div class="card-title">// GENERATE LINK CODE</div>

    <div class="input-group">
      <label for="phone">Your WhatsApp Number</label>
      <div class="phone-wrap">
        <span class="phone-prefix">📱</span>
        <input
          type="tel"
          id="phone"
          placeholder="2547XXXXXXXX"
          autocomplete="tel"
          maxlength="15"
        />
      </div>
    </div>

    <button class="btn" id="pairBtn" onclick="requestCode()">
      <span id="btn-text">GENERATE CODE</span>
    </button>

    <div id="error-msg"></div>

    <div id="result">
      <div class="result-inner">
        <div class="code-display" id="code-display">----</div>
        <ul class="steps">
          <li>Open <strong>WhatsApp</strong> on your phone</li>
          <li>Go to <strong>Settings → Linked Devices</strong></li>
          <li>Tap <strong>Link a Device</strong></li>
          <li>Select <strong>Link with phone number</strong></li>
          <li>Enter the code above</li>
        </ul>
        <div class="wa-note">
          <span class="wa-dot"></span>
          Code also sent to your WhatsApp as a notification
        </div>
      </div>
    </div>
  </div>

  <div class="status-bar">
    <span class="dot"></span>
    DARKLORD FARHAN // SYSTEM ONLINE // PORT <span id="portLabel">3000</span>
    <span class="dot"></span>
  </div>

</div>

<script>
  // Show current port in status bar
  document.getElementById('portLabel').textContent = location.port || '80'

  async function requestCode() {
    const btn = document.getElementById('pairBtn')
    const btnText = document.getElementById('btn-text')
    const errEl = document.getElementById('error-msg')
    const result = document.getElementById('result')
    const codeDisplay = document.getElementById('code-display')

    let number = document.getElementById('phone').value.trim()
    number = number.replace(/[^0-9]/g, '')

    // Reset
    errEl.style.display = 'none'
    result.style.display = 'none'

    if (!number || number.length < 7) {
      showError('Please enter a valid phone number (digits only, with country code).')
      return
    }

    // Loading state
    btn.disabled = true
    btnText.innerHTML = '<span class="dots"><span></span><span></span><span></span></span> REQUESTING CODE'

    try {
      const res = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number })
      })

      const data = await res.json()

      if (!data.success) {
        showError(data.error || 'Something went wrong. Try again.')
        return
      }

      // Format code with dashes every 4 chars for readability
      const raw = data.code.replace(/-/g, '')
      const formatted = raw.match(/.{1,4}/g)?.join('-') || data.code
      codeDisplay.textContent = formatted

      result.style.display = 'block'
      // Scroll to result
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    } catch (err) {
      showError('Network error — is the bot server running?')
    } finally {
      btn.disabled = false
      btnText.textContent = 'GENERATE NEW CODE'
    }
  }

  function showError(msg) {
    const el = document.getElementById('error-msg')
    el.textContent = '⚠ ' + msg
    el.style.display = 'block'
  }

  // Allow Enter key to submit
  document.getElementById('phone').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') requestCode()
  })
</script>
</body>
</html>
`)
})

app.listen(PORT, () => {
  console.log(`🌐 Web Server → http://localhost:${PORT}`)
})

startBot()
