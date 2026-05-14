# DarklordMD V5.7 — WhatsApp Bot with Web Pairing Portal

## Setup

```bash
npm install
npm start
```

The server starts on **port 3000** by default (set `PORT` env var to override).

## Pairing Your Phone

1. Open `http://localhost:3000` in your browser
2. Enter your WhatsApp number (with country code, e.g. `254795463911`)
3. Click **Generate Code**
4. You'll receive:
   - The code displayed on the web page
   - A WhatsApp message to your number with the code
5. Open WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number
6. Enter the 8-digit code

## Commands

| Command | Description |
|---------|-------------|
| `.menu` | Show full menu with bot logo |
| `.ping` | Check bot latency |
| `.alive` | Confirm bot is online |
| `.owner` | Show owner contact |
| `.time` | Show current Nairobi time |
| `.help` | Show help |

## Notes

- Session files are stored in `./session/` — keep this folder safe
- To re-pair: delete `./session/` folder and restart
- Built on Baileys (WhiskeySockets)
