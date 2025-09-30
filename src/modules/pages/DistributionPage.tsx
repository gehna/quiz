import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../modules/auth/AuthContext'
import { apiFetch } from '../../utils/api'

type Judge = { id: string; number?: string; fullName: string }
type Stage = { id: string; number: string; name: string }
type Pair = { id: string; judgeId: string; stageId: string }

function key(user: string | null) { return user ? `distribution:list:${user}` : 'distribution:list:guest' }

export default function DistributionPage() {
  const { currentUser } = useAuth()
  const [judges, setJudges] = useState<Judge[]>([])
  const [stages, setStages] = useState<Stage[]>([])
  const [pairs, setPairs] = useState<Pair[]>([])

  useEffect(() => {
    async function loadAll() {
      const user = currentUser || 'guest'
      try {
        const [j, s] = await Promise.all([
          apiFetch(`/api/judges?user=${encodeURIComponent(user)}`).then(r => r.json()),
          apiFetch(`/api/stages?user=${encodeURIComponent(user)}`).then(r => r.json()),
        ])
        setJudges(Array.isArray(j.judges) ? j.judges : [])
        setStages(Array.isArray(s.stages) ? s.stages : [])
      } catch {}

      try {
        const res = await apiFetch(`/api/distribution?user=${encodeURIComponent(user)}`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data?.distribution)) setPairs(data.distribution)
        }
      } catch {
        const raw = localStorage.getItem(key(currentUser))
        if (raw) {
          try { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) setPairs(parsed) } catch {}
        }
      }
    }
    loadAll()
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem(key(currentUser), JSON.stringify(pairs))
  }, [pairs, currentUser])

  const handleAdd = () => {
    const firstJudge = judges[0]?.id || ''
    const firstStage = stages[0]?.id || ''
    setPairs((prev) => [...prev, { id: crypto.randomUUID(), judgeId: firstJudge, stageId: firstStage }])
  }

  const handleRemove = (id: string) => {
    setPairs((prev) => prev.filter((p) => p.id !== id))
  }

  const handleChange = (id: string, field: keyof Pair, value: string) => {
    setPairs((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  const canAddMore = useMemo(() => pairs.length < 200 && judges.length && stages.length, [pairs.length, judges.length, stages.length])

  const handleSave = async () => {
    const filtered = pairs.filter((p) => p.judgeId && p.stageId)
    setPairs(filtered)
    localStorage.setItem(key(currentUser), JSON.stringify(filtered))
    try {
      const user = currentUser || 'guest'
      await apiFetch('/api/distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, distribution: filtered }),
      })
      // saved successfully (silent)
    } catch {
      // fallback saved locally (silent)
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '8px 0 16px' }}>Распределение</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {pairs.map((pair) => (
          <div
            key={pair.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 44px',
              gap: 6,
              alignItems: 'center',
            }}
          >
            <select
              value={pair.judgeId}
              onChange={(e) => handleChange(pair.id, 'judgeId', e.target.value)}
              style={{ fontSize: 15, padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e5ea', minWidth: 0, boxSizing: 'border-box' }}
            >
              {judges.map((j, idx) => (
                <option key={j.id} value={j.id}>{(j.number ? j.number : String(idx + 1))}-{j.fullName || '(без ФИО)'}</option>
              ))}
            </select>
            <select
              value={pair.stageId}
              onChange={(e) => handleChange(pair.id, 'stageId', e.target.value)}
              style={{ fontSize: 15, padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e5ea', minWidth: 0, boxSizing: 'border-box' }}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.number ? `${s.number}. ` : ''}{s.name || '(без названия)'}</option>
              ))}
            </select>
            <button
              aria-label="Удалить"
              onClick={() => handleRemove(pair.id)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid #e53935',
                background: '#ffe8e8',
                color: '#e53935',
                fontSize: 18,
                lineHeight: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <button
            onClick={handleAdd}
            disabled={!canAddMore}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              border: '1px solid #0bb783',
              background: '#0bd18a',
              color: '#fff',
              fontSize: 28,
              lineHeight: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Добавить связь"
            title="Добавить связь"
          >
            +
          </button>
        </div>

        <div
          style={{
            position: 'sticky',
            bottom: 12,
            background: 'linear-gradient(transparent, #fff 24px)',
            paddingTop: 24,
          }}
        >
          <button
            onClick={handleSave}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 16,
              borderRadius: 12,
              border: '1px solid #0bb783',
              background: '#0bd18a',
              color: '#fff',
              fontWeight: 700,
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}


