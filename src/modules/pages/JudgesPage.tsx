import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../modules/auth/AuthContext'

type Judge = {
  id: string
  fullName: string
  email: string
}

function getStorageKey(user: string | null) {
  return user ? `judges:list:${user}` : 'judges:list:guest'
}

export default function JudgesPage() {
  const { currentUser } = useAuth()
  const [judges, setJudges] = useState<Judge[]>([])
  const [invalidFullNameIds, setInvalidFullNameIds] = useState<Set<string>>(new Set())
  const [invalidEmailIds, setInvalidEmailIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const user = currentUser || 'guest'
        const res = await fetch(`http://localhost:4000/api/judges?user=${encodeURIComponent(user)}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (Array.isArray(data?.judges)) {
          const migrated = data.judges.map((j: any) => ({ id: j.id, fullName: j.fullName, email: j.email ?? j.telegram ?? '' }))
          setJudges(migrated)
        } else {
          setJudges([{ id: crypto.randomUUID(), fullName: '', email: '' }])
        }
      } catch {
        const raw = localStorage.getItem(getStorageKey(currentUser))
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              const migrated = parsed.map((j: any) => ({ id: j.id, fullName: j.fullName, email: j.email ?? j.telegram ?? '' }))
              setJudges(migrated)
            }
          } catch {}
        } else {
          setJudges([{ id: crypto.randomUUID(), fullName: '', email: '' }])
        }
      }
    }
    load()
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(judges))
  }, [judges, currentUser])

  const handleAdd = () => {
    setJudges((prev) => [...prev, { id: crypto.randomUUID(), fullName: '', email: '' }])
  }

  const handleRemove = (id: string) => {
    setJudges((prev) => prev.filter((j) => j.id !== id))
  }

  const handleChange = (id: string, field: keyof Judge, value: string) => {
    setJudges((prev) => prev.map((j) => (j.id === id ? { ...j, [field]: value } : j)))
    if (field === 'fullName') {
      setInvalidFullNameIds((prev) => {
        const next = new Set(prev)
        if (value.trim()) next.delete(id)
        return next
      })
    }
    if (field === 'email') {
      setInvalidEmailIds((prev) => {
        const next = new Set(prev)
        if (value.trim()) next.delete(id)
        return next
      })
    }
  }

  const canAddMore = useMemo(() => judges.length < 50, [judges.length])

  const handleSave = async () => {
    const normalized = judges.map((j) => ({ ...j, fullName: j.fullName.trim(), email: j.email.trim() }))
    const missingFullName = normalized.filter((j) => !j.fullName).map((j) => j.id)
    const missingEmail = normalized.filter((j) => !j.email).map((j) => j.id)
    setInvalidFullNameIds(new Set(missingFullName))
    setInvalidEmailIds(new Set(missingEmail))
    if (missingFullName.length || missingEmail.length) return
    const filtered = normalized.filter((j) => j.fullName || j.email)
    setJudges(filtered.length ? filtered : [{ id: crypto.randomUUID(), fullName: '', email: '' }])
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(filtered))
    try {
      const user = currentUser || 'guest'
      await fetch('http://localhost:4000/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, judges: filtered }),
      })
      alert('Сохранено')
    } catch {
      alert('Сохранено локально (сервер недоступен)')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '8px 0 16px' }}>Ввод судей</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {judges.map((judge, index) => (
          <div
            key={judge.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: 8,
              alignItems: 'start',
            }}
          >
            <div style={{ position: 'relative', paddingBottom: 8, minWidth: 0 }}>
              <input
                value={judge.fullName}
                onChange={(e) => handleChange(judge.id, 'fullName', e.target.value)}
                placeholder={`ФИО${index === 0 ? '' : ''}`}
                style={{
                  fontSize: 16,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: invalidFullNameIds.has(judge.id) ? '1px solid #e53935' : '1px solid #e5e5ea',
                  minWidth: 0,
                }}
                aria-invalid={invalidFullNameIds.has(judge.id)}
              />
              {invalidFullNameIds.has(judge.id) && (
                <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, color: '#e53935', fontSize: 11, lineHeight: '11px', margin: 0, whiteSpace: 'nowrap' }}>Обязательно</div>
              )}
            </div>
            <div style={{ position: 'relative', paddingBottom: 8, minWidth: 0 }}>
              <input
                value={judge.email}
                onChange={(e) => handleChange(judge.id, 'email', e.target.value)}
                placeholder="email"
                style={{
                  fontSize: 16,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: invalidEmailIds.has(judge.id) ? '1px solid #e53935' : '1px solid #e5e5ea',
                  minWidth: 0,
                }}
                aria-invalid={invalidEmailIds.has(judge.id)}
              />
              {invalidEmailIds.has(judge.id) && (
                <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, color: '#e53935', fontSize: 11, lineHeight: '11px', margin: 0, whiteSpace: 'nowrap' }}>Обязательно</div>
              )}
            </div>
            <button
              aria-label="Удалить"
              onClick={() => handleRemove(judge.id)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                border: '1px solid #e53935',
                background: '#ffe8e8',
                color: '#e53935',
                fontSize: 20,
                lineHeight: '20px',
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
            aria-label="Добавить участника"
            title="Добавить участника"
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


