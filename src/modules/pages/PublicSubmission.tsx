import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../utils/api'

type Stage = { id: string; number: string; name: string }

export default function PublicSubmission() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [judgeName, setJudgeName] = useState<string>('')
  const [stage, setStage] = useState<Stage | null>(null)
  const [teams, setTeams] = useState<Array<{ id: string; number: string; name: string }>>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [invalidIds, setInvalidIds] = useState<Set<string>>(new Set())
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await apiFetch(`/api/submission/${token}`)
        if (!res.ok) throw new Error('not found')
        const data = await res.json()
        setJudgeName(data.judgeName || '')
        setStage(data.stage || null)
        setTeams(Array.isArray(data.teams) ? data.teams : [])
        if (Array.isArray(data.answers)) {
          const map: Record<string, string> = {}
          for (const a of data.answers) {
            if (a && a.teamId) map[a.teamId] = String(a.value ?? '')
          }
          setAnswers(map)
        }
      } catch {
        setError('Ссылка недействительна')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleChange = (teamId: string, value: string) => {
    // allow only digits, strip leading zeros
    const digits = (value || '').replace(/\D+/g, '')
    const normalized = digits.replace(/^0+(\d)/, '$1')
    setAnswers((prev) => ({ ...prev, [teamId]: normalized }))
    setInvalidIds((prev) => { const next = new Set(prev); next.delete(teamId); return next })
    setGlobalError(null)
  }

  const handleSave = () => {
    const arr = teams.map((t) => ({ teamId: t.id, value: answers[t.id] || '' }))
    apiFetch(`/api/submission/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: arr, submitted: false }),
    }).then(() => {
      alert('Черновик сохранен')
    }).catch(() => {
      alert('Не удалось сохранить')
    })
  }

  const handleSubmit = async () => {
    // validation: every team must have a place from 1..N, no gaps, no duplicates
    const n = teams.length
    const values = teams.map((t) => Number(answers[t.id] || NaN))
    const missingOrInvalidIds: string[] = []
    const seen = new Set<number>()
    for (let i = 0; i < teams.length; i++) {
      const v = values[i]
      if (!Number.isInteger(v) || v < 1 || v > n) {
        missingOrInvalidIds.push(teams[i].id)
      } else if (seen.has(v)) {
        missingOrInvalidIds.push(teams[i].id)
      } else {
        seen.add(v)
      }
    }
    if (missingOrInvalidIds.length > 0 || seen.size !== n) {
      setInvalidIds(new Set(missingOrInvalidIds))
      setGlobalError(`Введите уникальные места от 1 до ${n} без пропусков`)
      return
    }
    try {
      const arr = teams.map((t) => ({ teamId: t.id, value: String(answers[t.id]) }))
      await apiFetch(`/api/submission/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: arr, submitted: true }),
      })
      alert('Отправлено')
    } catch {
      alert('Не удалось отправить')
    }
  }

  if (loading) return <div style={{ padding: 16 }}>Загрузка…</div>
  if (error) return <div style={{ padding: 16 }}>{error}</div>

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={async () => {
            // validate like submit; if invalid, reset submitted state to false
            const n = teams.length
            const values = teams.map((t) => Number(answers[t.id] || NaN))
            const missingOrInvalidIds: string[] = []
            const seen = new Set<number>()
            for (let i = 0; i < teams.length; i++) {
              const v = values[i]
              if (!Number.isInteger(v) || v < 1 || v > n) {
                missingOrInvalidIds.push(teams[i].id)
              } else if (seen.has(v)) {
                missingOrInvalidIds.push(teams[i].id)
              } else {
                seen.add(v)
              }
            }
            if (missingOrInvalidIds.length > 0 || seen.size !== n) {
              try {
                const arr = teams.map((t) => ({ teamId: t.id, value: String(answers[t.id] || '') }))
                await apiFetch(`/api/submission/${token}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ answers: arr, submitted: false }),
                })
              } catch {}
            }
            navigate('/report')
          }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e5ea' }}
        >
          Назад
        </button>
      </div>
      <h2 style={{ margin: '8px 0 8px' }}>{judgeName ? `Судья: ${judgeName}` : 'Судья'}</h2>
      <div style={{ marginBottom: 12, color: '#555' }}>{stage ? `Этап: ${stage.number ? stage.number + '. ' : ''}${stage.name}` : 'Этап не назначен'}</div>
      {globalError && (
        <div style={{ marginBottom: 8, color: '#e53935', fontSize: 13 }}>{globalError}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.map((t) => (
          <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8, alignItems: 'center' }}>
            <div>{t.number ? `${t.number}. ` : ''}{t.name}</div>
            <input
              value={answers[t.id] || ''}
              onChange={(e) => handleChange(t.id, e.target.value)}
              placeholder="Место"
              inputMode="numeric"
              pattern="[0-9]*"
              style={{ fontSize: 16, padding: '10px 12px', borderRadius: 8, border: invalidIds.has(t.id) ? '1px solid #e53935' : '1px solid #e5e5ea' }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <button onClick={handleSave} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #e5e5ea' }}>Сохранить</button>
        <button onClick={handleSubmit} style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: '1px solid #0bb783', background: '#0bd18a', color: '#fff', fontWeight: 700 }}>Отправить</button>
      </div>
    </div>
  )
}

