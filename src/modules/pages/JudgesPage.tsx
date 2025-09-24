import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../modules/auth/AuthContext'

type Judge = {
  id: string
  number: string
  fullName: string
}

function getStorageKey(user: string | null) {
  return user ? `judges:list:${user}` : 'judges:list:guest'
}

export default function JudgesPage() {
  const { currentUser } = useAuth()
  const [judges, setJudges] = useState<Judge[]>([])
  const [invalidFullNameIds, setInvalidFullNameIds] = useState<Set<string>>(new Set())
  const [invalidNumberIds, setInvalidNumberIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const user = currentUser || 'guest'
        const res = await fetch(`http://localhost:4000/api/judges?user=${encodeURIComponent(user)}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (Array.isArray(data?.judges)) {
          const migrated = data.judges.map((j: any, idx: number) => ({ id: j.id, number: String(idx + 1), fullName: j.fullName }))
          setJudges(migrated)
        } else {
          setJudges([{ id: crypto.randomUUID(), number: '1', fullName: '' }])
        }
      } catch {
        const raw = localStorage.getItem(getStorageKey(currentUser))
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              const migrated = parsed.map((j: any, idx: number) => ({ id: j.id, number: String(j.number ?? idx + 1), fullName: j.fullName }))
              setJudges(migrated)
            }
          } catch {}
        } else {
          setJudges([{ id: crypto.randomUUID(), number: '1', fullName: '' }])
        }
      }
    }
    load()
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(judges))
  }, [judges, currentUser])

  const renumber = (list: Judge[]) => list.map((j, idx) => ({ ...j, number: String(idx + 1) }))

  const handleAdd = () => {
    setJudges((prev) => renumber([...prev, { id: crypto.randomUUID(), number: '', fullName: '' }]))
  }

  const handleRemove = (id: string) => {
    setJudges((prev) => renumber(prev.filter((j) => j.id !== id)))
  }

  const handleChange = (id: string, field: keyof Judge, value: string) => {
    setJudges((prev) => {
      const next = prev.map((j) => (j.id === id ? { ...j, [field]: value } : j))
      if (field === 'number') return renumber(next)
      return next
    })
    if (field === 'fullName') {
      setInvalidFullNameIds((prev) => {
        const next = new Set(prev)
        if (value.trim()) next.delete(id)
        return next
      })
    }
    if (field === 'number') {
      setInvalidNumberIds((prev) => { const next = new Set(prev); if (value.trim()) next.delete(id); return next })
    }
  }

  const canAddMore = useMemo(() => judges.length < 50, [judges.length])

  const handleSave = async () => {
    const normalized = judges.map((j) => ({ ...j, number: j.number.trim(), fullName: j.fullName.trim() }))
    const missingFullName = normalized.filter((j) => !j.fullName).map((j) => j.id)
    const missingNumber = normalized.filter((j) => !j.number).map((j) => j.id)
    setInvalidFullNameIds(new Set(missingFullName))
    setInvalidNumberIds(new Set(missingNumber))
    if (missingFullName.length || missingNumber.length) return
    const filtered = normalized.filter((j) => j.fullName || j.number)
    setJudges(filtered.length ? filtered : [{ id: crypto.randomUUID(), number: '1', fullName: '' }])
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
              gridTemplateColumns: '1fr 2fr auto',
              gap: 8,
              alignItems: 'start',
            }}
          >
            <div style={{ position: 'relative', paddingBottom: 8, minWidth: 0 }}>
              <input
                value={judge.number}
                onChange={(e) => handleChange(judge.id, 'number', e.target.value)}
                placeholder="Номер"
                style={{
                  fontSize: 16,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: invalidNumberIds.has(judge.id) ? '1px solid #e53935' : '1px solid #e5e5ea',
                  minWidth: 0,
                }}
                aria-invalid={invalidNumberIds.has(judge.id)}
              />
              {invalidNumberIds.has(judge.id) && (
                <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, color: '#e53935', fontSize: 11, lineHeight: '11px', margin: 0, whiteSpace: 'nowrap' }}>Обязательно</div>
              )}
            </div>
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


