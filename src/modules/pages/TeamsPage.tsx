import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../modules/auth/AuthContext'

type Team = { id: string; number: string; name: string }

function getStorageKey(user: string | null) {
  return user ? `teams:list:${user}` : 'teams:list:guest'
}

export default function TeamsPage() {
  const { currentUser } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [invalidNumberIds, setInvalidNumberIds] = useState<Set<string>>(new Set())
  const [invalidNameIds, setInvalidNameIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const user = currentUser || 'guest'
        const res = await fetch(`http://localhost:4000/api/teams?user=${encodeURIComponent(user)}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (Array.isArray(data?.teams)) {
          setTeams(data.teams)
        } else {
          setTeams([{ id: crypto.randomUUID(), number: '', name: '' }])
        }
      } catch {
        const raw = localStorage.getItem(getStorageKey(currentUser))
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) setTeams(parsed)
          } catch {}
        } else {
          setTeams([{ id: crypto.randomUUID(), number: '', name: '' }])
        }
      }
    }
    load()
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(teams))
  }, [teams, currentUser])

  const handleAdd = () => {
    setTeams((prev) => [...prev, { id: crypto.randomUUID(), number: '', name: '' }])
  }

  const handleRemove = (id: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== id))
  }

  const handleChange = (id: string, field: keyof Team, value: string) => {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)))
    if (field === 'number') {
      setInvalidNumberIds((prev) => { const next = new Set(prev); if (value.trim()) next.delete(id); return next })
    }
    if (field === 'name') {
      setInvalidNameIds((prev) => { const next = new Set(prev); if (value.trim()) next.delete(id); return next })
    }
  }

  const canAddMore = useMemo(() => teams.length < 200, [teams.length])

  const handleSave = async () => {
    const normalized = teams.map((t) => ({ ...t, number: t.number.trim(), name: t.name.trim() }))
    const missingNumber = normalized.filter((t) => !t.number).map((t) => t.id)
    const missingName = normalized.filter((t) => !t.name).map((t) => t.id)
    setInvalidNumberIds(new Set(missingNumber))
    setInvalidNameIds(new Set(missingName))
    if (missingNumber.length || missingName.length) return

    const filtered = normalized.filter((t) => t.number || t.name)
    setTeams(filtered.length ? filtered : [{ id: crypto.randomUUID(), number: '', name: '' }])
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(filtered))
    try {
      const user = currentUser || 'guest'
      await fetch('http://localhost:4000/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, teams: filtered }),
      })
      alert('Сохранено')
    } catch {
      alert('Сохранено локально (сервер недоступен)')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '8px 0 16px' }}>Команды</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {teams.map((team) => (
          <div
            key={team.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr auto',
              gap: 8,
              alignItems: 'start',
            }}
          >
            <div style={{ position: 'relative', paddingBottom: 8, minWidth: 0 }}>
              <input
                value={team.number}
                onChange={(e) => handleChange(team.id, 'number', e.target.value)}
                placeholder="Номер"
                style={{ fontSize: 16, padding: '10px 12px', borderRadius: 8, border: invalidNumberIds.has(team.id) ? '1px solid #e53935' : '1px solid #e5e5ea', minWidth: 0 }}
                aria-invalid={invalidNumberIds.has(team.id)}
              />
              {invalidNumberIds.has(team.id) && (
                <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, color: '#e53935', fontSize: 11, lineHeight: '11px', margin: 0, whiteSpace: 'nowrap' }}>Обязательно</div>
              )}
            </div>
            <div style={{ position: 'relative', paddingBottom: 8, minWidth: 0 }}>
              <input
                value={team.name}
                onChange={(e) => handleChange(team.id, 'name', e.target.value)}
                placeholder="Название команды"
                style={{ fontSize: 16, padding: '10px 12px', borderRadius: 8, border: invalidNameIds.has(team.id) ? '1px solid #e53935' : '1px solid #e5e5ea', minWidth: 0 }}
                aria-invalid={invalidNameIds.has(team.id)}
              />
              {invalidNameIds.has(team.id) && (
                <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, color: '#e53935', fontSize: 11, lineHeight: '11px', margin: 0, whiteSpace: 'nowrap' }}>Обязательно</div>
              )}
            </div>
            <button
              aria-label="Удалить"
              onClick={() => handleRemove(team.id)}
              style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #e53935', background: '#ffe8e8', color: '#e53935', fontSize: 20, lineHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <button
            onClick={handleAdd}
            disabled={!canAddMore}
            style={{ width: 48, height: 48, borderRadius: 24, border: '1px solid #0bb783', background: '#0bd18a', color: '#fff', fontSize: 28, lineHeight: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Добавить команду"
            title="Добавить команду"
          >
            +
          </button>
        </div>

        <div style={{ position: 'sticky', bottom: 12, background: 'linear-gradient(transparent, #fff 24px)', paddingTop: 24 }}>
          <button onClick={handleSave} style={{ width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 12, border: '1px solid #0bb783', background: '#0bd18a', color: '#fff', fontWeight: 700 }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

