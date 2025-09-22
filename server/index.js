const http = require('http')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 4000
const DATA_DIR = path.join(__dirname, 'data')
const DATA_FILE = path.join(DATA_DIR, 'judges.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf-8')

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function send(res, status, body, headers = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json' }
  res.writeHead(status, { ...defaultHeaders, ...headers })
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  // Basic CORS (useful if not using proxy)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return send(res, 204, '')

  const url = new URL(req.url, `http://${req.headers.host}`)
  if (url.pathname === '/api/judges') {
    if (req.method === 'GET') {
      const user = url.searchParams.get('user')
      if (!user) return send(res, 400, { error: 'Missing user' })
      const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
      return send(res, 200, { judges: db[user] || [] })
    }
    if (req.method === 'POST') {
      try {
        const raw = await readBody(req)
        const payload = JSON.parse(raw || '{}')
        const { user, judges } = payload
        if (!user || !Array.isArray(judges)) return send(res, 400, { error: 'Invalid payload' })
        const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
        db[user] = judges
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8')
        return send(res, 200, { ok: true })
      } catch (e) {
        return send(res, 500, { error: 'Server error' })
      }
    }
  }

  send(res, 404, { error: 'Not found' })
})

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})


