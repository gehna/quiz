const http = require('http')
const fs = require('fs')
const path = require('path')
const nodemailer = require('nodemailer')

const PORT = process.env.PORT || 4000
const DATA_DIR = path.join(__dirname, 'data')
// SMTP config via env
const SMTP_HOST = process.env.SMTP_HOST || ''
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'noreply@example.com'

function getTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}
const DATA_FILE = path.join(DATA_DIR, 'judges.json')
const DATA_FILE_STAGES = path.join(DATA_DIR, 'stages.json')
const DATA_FILE_DISTRIBUTION = path.join(DATA_DIR, 'distribution.json')
const DATA_FILE_TEAMS = path.join(DATA_DIR, 'teams.json')
const DATA_FILE_SUBMISSIONS = path.join(DATA_DIR, 'submissions.json')

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf-8')
if (!fs.existsSync(DATA_FILE_STAGES)) fs.writeFileSync(DATA_FILE_STAGES, JSON.stringify({}), 'utf-8')
if (!fs.existsSync(DATA_FILE_DISTRIBUTION)) fs.writeFileSync(DATA_FILE_DISTRIBUTION, JSON.stringify({}), 'utf-8')
if (!fs.existsSync(DATA_FILE_TEAMS)) fs.writeFileSync(DATA_FILE_TEAMS, JSON.stringify({}), 'utf-8')
if (!fs.existsSync(DATA_FILE_SUBMISSIONS)) fs.writeFileSync(DATA_FILE_SUBMISSIONS, JSON.stringify({}), 'utf-8')

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

  if (url.pathname === '/api/stages') {
    if (req.method === 'GET') {
      const user = url.searchParams.get('user')
      if (!user) return send(res, 400, { error: 'Missing user' })
      const db = JSON.parse(fs.readFileSync(DATA_FILE_STAGES, 'utf-8'))
      return send(res, 200, { stages: db[user] || [] })
    }
    if (req.method === 'POST') {
      try {
        const raw = await readBody(req)
        const payload = JSON.parse(raw || '{}')
        const { user, stages } = payload
        if (!user || !Array.isArray(stages)) return send(res, 400, { error: 'Invalid payload' })
        const db = JSON.parse(fs.readFileSync(DATA_FILE_STAGES, 'utf-8'))
        db[user] = stages
        fs.writeFileSync(DATA_FILE_STAGES, JSON.stringify(db, null, 2), 'utf-8')
        return send(res, 200, { ok: true })
      } catch (e) {
        return send(res, 500, { error: 'Server error' })
      }
    }
  }

  if (url.pathname === '/api/distribution') {
    if (req.method === 'GET') {
      const user = url.searchParams.get('user')
      if (!user) return send(res, 400, { error: 'Missing user' })
      const db = JSON.parse(fs.readFileSync(DATA_FILE_DISTRIBUTION, 'utf-8'))
      return send(res, 200, { distribution: db[user] || [] })
    }
    if (req.method === 'POST') {
      try {
        const raw = await readBody(req)
        const payload = JSON.parse(raw || '{}')
        const { user, distribution } = payload
        if (!user || !Array.isArray(distribution)) return send(res, 400, { error: 'Invalid payload' })
        const db = JSON.parse(fs.readFileSync(DATA_FILE_DISTRIBUTION, 'utf-8'))
        db[user] = distribution
        fs.writeFileSync(DATA_FILE_DISTRIBUTION, JSON.stringify(db, null, 2), 'utf-8')
        return send(res, 200, { ok: true })
      } catch (e) {
        return send(res, 500, { error: 'Server error' })
      }
    }
  }

  if (url.pathname === '/api/teams') {
    if (req.method === 'GET') {
      const user = url.searchParams.get('user')
      if (!user) return send(res, 400, { error: 'Missing user' })
      const db = JSON.parse(fs.readFileSync(DATA_FILE_TEAMS, 'utf-8'))
      return send(res, 200, { teams: db[user] || [] })
    }
    if (req.method === 'POST') {
      try {
        const raw = await readBody(req)
        const payload = JSON.parse(raw || '{}')
        const { user, teams } = payload
        if (!user || !Array.isArray(teams)) return send(res, 400, { error: 'Invalid payload' })
        const db = JSON.parse(fs.readFileSync(DATA_FILE_TEAMS, 'utf-8'))
        db[user] = teams
        fs.writeFileSync(DATA_FILE_TEAMS, JSON.stringify(db, null, 2), 'utf-8')
        return send(res, 200, { ok: true })
      } catch (e) {
        return send(res, 500, { error: 'Server error' })
      }
    }
  }

  // Report/submission flow
  if (url.pathname === '/api/report/send' && req.method === 'POST') {
    try {
      const raw = await readBody(req)
      const { user } = JSON.parse(raw || '{}')
      if (!user) return send(res, 400, { error: 'Missing user' })
      const judgesDb = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
      const stagesDb = JSON.parse(fs.readFileSync(DATA_FILE_STAGES, 'utf-8'))
      const distrDb = JSON.parse(fs.readFileSync(DATA_FILE_DISTRIBUTION, 'utf-8'))
      const teamsDb = JSON.parse(fs.readFileSync(DATA_FILE_TEAMS, 'utf-8'))
      const userJudges = judgesDb[user] || []
      const userStages = stagesDb[user] || []
      const userDistr = distrDb[user] || []
      const userTeams = teamsDb[user] || []
      const subsDb = JSON.parse(fs.readFileSync(DATA_FILE_SUBMISSIONS, 'utf-8'))
      subsDb[user] = subsDb[user] || {}
      const links = []
      const transport = getTransport()
      for (const j of userJudges) {
        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
        // find assigned stage for the judge
        const pair = userDistr.find((p) => p.judgeId === j.id)
        const stage = pair ? (userStages.find((s) => s.id === pair.stageId) || null) : null
        subsDb[user][token] = {
          judgeId: j.id,
          submitted: false,
          answers: [],
          stage: stage,
          teams: userTeams,
          judgeName: j.fullName || ''
        }
        links.push({ judgeId: j.id, token, url: `/s/${token}` })

        // Try to send email if SMTP is configured and email exists
        if (transport && j.email) {
          const subject = `${j.fullName || 'Судья'} — Этап: ${stage ? (stage.number ? stage.number + '. ' : '') + (stage.name || '') : 'не назначен'}`
          const link = `http://localhost:${PORT}/s/${token}`
          const text = `Здравствуйте, ${j.fullName || ''}.
Перейдите по ссылке и заполните форму этапа:
${link}
`
          try { await transport.sendMail({ from: SMTP_FROM, to: j.email, subject, text }) } catch {}
        }
      }
      fs.writeFileSync(DATA_FILE_SUBMISSIONS, JSON.stringify(subsDb, null, 2), 'utf-8')
      return send(res, 200, { links })
    } catch (e) {
      return send(res, 500, { error: 'Server error' })
    }
  }

  if (url.pathname === '/api/report/send-one' && req.method === 'POST') {
    try {
      const raw = await readBody(req)
      const { user, judgeId } = JSON.parse(raw || '{}')
      if (!user) return send(res, 400, { error: 'Missing user' })
      const judgesDb = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
      const stagesDb = JSON.parse(fs.readFileSync(DATA_FILE_STAGES, 'utf-8'))
      const distrDb = JSON.parse(fs.readFileSync(DATA_FILE_DISTRIBUTION, 'utf-8'))
      const teamsDb = JSON.parse(fs.readFileSync(DATA_FILE_TEAMS, 'utf-8'))
      const subsDb = JSON.parse(fs.readFileSync(DATA_FILE_SUBMISSIONS, 'utf-8'))
      const userJudges = judgesDb[user] || []
      const userStages = stagesDb[user] || []
      const userDistr = distrDb[user] || []
      const userTeams = teamsDb[user] || []
      const judge = judgeId ? userJudges.find(j => j.id === judgeId) : userJudges[0]
      if (!judge) return send(res, 400, { error: 'No judges for user' })
      const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      const pair = userDistr.find((p) => p.judgeId === judge.id)
      const stage = pair ? (userStages.find((s) => s.id === pair.stageId) || null) : null
      subsDb[user] = subsDb[user] || {}
      subsDb[user][token] = { judgeId: judge.id, submitted: false, answers: [], stage, teams: userTeams, judgeName: judge.fullName || '' }
      fs.writeFileSync(DATA_FILE_SUBMISSIONS, JSON.stringify(subsDb, null, 2), 'utf-8')
      const urlOut = `http://localhost:${PORT}/s/${token}`
      return send(res, 200, { url: urlOut, token, judgeId: judge.id })
    } catch (e) {
      return send(res, 500, { error: 'Server error' })
    }
  }

  if (url.pathname === '/api/report/status' && req.method === 'GET') {
    const user = url.searchParams.get('user')
    if (!user) return send(res, 400, { error: 'Missing user' })
    const subsDb = JSON.parse(fs.readFileSync(DATA_FILE_SUBMISSIONS, 'utf-8'))
    const judgesDb = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'))
    const userJudges = judgesDb[user] || []
    const byJudge = {}
    const entries = subsDb[user] ? Object.values(subsDb[user]) : []
    for (const rec of entries) {
      byJudge[rec.judgeId] = rec.submitted === true
    }
    const status = userJudges.map(j => ({ judgeId: j.id, submitted: Boolean(byJudge[j.id]) }))
    return send(res, 200, { status })
  }

  if (url.pathname === '/api/report/results' && req.method === 'GET') {
    const user = url.searchParams.get('user')
    if (!user) return send(res, 400, { error: 'Missing user' })
    const subsDb = JSON.parse(fs.readFileSync(DATA_FILE_SUBMISSIONS, 'utf-8'))
    const stagesDb = JSON.parse(fs.readFileSync(DATA_FILE_STAGES, 'utf-8'))
    const teamsDb = JSON.parse(fs.readFileSync(DATA_FILE_TEAMS, 'utf-8'))

    const userSubs = subsDb[user] || {}
    const userStages = stagesDb[user] || []
    const userTeams = teamsDb[user] || []
    // Build a map stageId -> { teamId -> place }
    const stageIdToTeamPlace = {}
    for (const token of Object.keys(userSubs)) {
      const rec = userSubs[token]
      const stageId = rec.stage?.id
      if (!stageId || !Array.isArray(rec.answers)) continue
      stageIdToTeamPlace[stageId] = stageIdToTeamPlace[stageId] || {}
      for (const a of rec.answers) {
        if (a && a.teamId && a.value != null && a.value !== '') {
          stageIdToTeamPlace[stageId][a.teamId] = Number(a.value)
        }
      }
    }
    // Compute per-team totals
    const results = userTeams.map((t) => {
      const perStage = {}
      let total = 0
      for (const st of userStages) {
        const v = stageIdToTeamPlace[st.id]?.[t.id]
        if (typeof v === 'number' && Number.isFinite(v)) {
          perStage[st.id] = v
          total += v
        } else {
          perStage[st.id] = null
        }
      }
      return { teamId: t.id, teamName: t.name || '', teamNumber: t.number || '', perStage, total }
    })
    // Rank by total ascending; missing values treated as large
    const MAX = 1e9
    results.sort((a, b) => (a.total || MAX) - (b.total || MAX))
    results.forEach((r, idx) => { r.place = idx + 1 })

    const stageColumns = userStages.map((s) => ({ id: s.id, name: (s.number ? s.number + '. ' : '') + (s.name || '') }))
    return send(res, 200, { stages: stageColumns, teams: userTeams.map(t => ({ id: t.id, name: t.name, number: t.number })), rows: results })
  }

  // Public submission endpoints
  if (url.pathname.startsWith('/api/submission/')) {
    const token = url.pathname.split('/').pop()
    if (!token) return send(res, 400, { error: 'Missing token' })
    if (req.method === 'GET') {
      const subsDb = JSON.parse(fs.readFileSync(DATA_FILE_SUBMISSIONS, 'utf-8'))
      // find token across users
      for (const user of Object.keys(subsDb)) {
        const rec = subsDb[user][token]
        if (rec) return send(res, 200, { ok: true, judgeId: rec.judgeId, judgeName: rec.judgeName, stage: rec.stage, teams: rec.teams, answers: rec.answers, submitted: rec.submitted })
      }
      return send(res, 404, { error: 'Invalid token' })
    }
    if (req.method === 'POST') {
      try {
        const raw = await readBody(req)
        const { answers } = JSON.parse(raw || '{}')
        const subsDb = JSON.parse(fs.readFileSync(DATA_FILE_SUBMISSIONS, 'utf-8'))
        for (const user of Object.keys(subsDb)) {
          if (subsDb[user][token]) {
            subsDb[user][token].answers = Array.isArray(answers) ? answers : []
            subsDb[user][token].submitted = true
            fs.writeFileSync(DATA_FILE_SUBMISSIONS, JSON.stringify(subsDb, null, 2), 'utf-8')
            return send(res, 200, { ok: true })
          }
        }
        return send(res, 404, { error: 'Invalid token' })
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


