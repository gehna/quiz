import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../modules/auth/AuthContext'

type Judge = {
  id: string
  fullName: string
  telegram: string
}

function getStorageKey(user: string | null) {
  return user ? `judges:list:${user}` : 'judges:list:guest'
}

export default function JudgesPage() {
  const { currentUser } = useAuth()
  const [judges, setJudges] = useState<Judge[]>([])
  const [invalidFullNameIds, setInvalidFullNameIds] = useState<Set<string>>(new Set())
  const [invalidTelegramIds, setInvalidTelegramIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      try {
        const user = currentUser || 'guest'
        const res = await fetch(`/api/judges?user=${encodeURIComponent(user)}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (Array.isArray(data?.judges)) {
          setJudges(data.judges)
        } else {
          setJudges([{ id: crypto.randomUUID(), fullName: '', telegram: '' }])
        }
      } catch {
        const raw = localStorage.getItem(getStorageKey(currentUser))
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) setJudges(parsed)
          } catch {}
        } else {
          setJudges([{ id: crypto.randomUUID(), fullName: '', telegram: '' }])
        }
      }
    }
    load()
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(judges))
  }, [judges, currentUser])

  const handleAdd = () => {
    setJudges((prev) => [...prev, { id: crypto.randomUUID(), fullName: '', telegram: '' }])
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
    if (field === 'telegram') {
      setInvalidTelegramIds((prev) => {
        const next = new Set(prev)
        if (value.trim()) next.delete(id)
        return next
      })
    }
  }

  const canAddMore = useMemo(() => judges.length < 50, [judges.length])

  const handleSave = async () => {
    const normalized = judges.map((j) => ({ ...j, fullName: j.fullName.trim(), telegram: j.telegram.trim() }))
    const missingFullName = normalized.filter((j) => !j.fullName).map((j) => j.id)
    const missingTelegram = normalized.filter((j) => !j.telegram).map((j) => j.id)
    setInvalidFullNameIds(new Set(missingFullName))
    setInvalidTelegramIds(new Set(missingTelegram))
    if (missingFullName.length || missingTelegram.length) return
    const filtered = normalized.filter((j) => j.fullName || j.telegram)
    setJudges(filtered.length ? filtered : [{ id: crypto.randomUUID(), fullName: '', telegram: '' }])
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(filtered))
    try {
      const user = currentUser || 'guest'
      await fetch('/api/judges', {
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
            <div style={{ position: 'relative', paddingBottom: 16, minWidth: 0 }}>
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
                <div style={{ position: 'absolute', top: '100%', left: 0, color: '#e53935', fontSize: 12 }}>Поле «ФИО» обязательно</div>
              )}
            </div>
            <div style={{ position: 'relative', paddingBottom: 16, minWidth: 0 }}>
              <input
                value={judge.telegram}
                onChange={(e) => handleChange(judge.id, 'telegram', e.target.value)}
                placeholder="Телеграмм"
                style={{
                  fontSize: 16,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: invalidTelegramIds.has(judge.id) ? '1px solid #e53935' : '1px solid #e5e5ea',
                  minWidth: 0,
                }}
                aria-invalid={invalidTelegramIds.has(judge.id)}
              />
              {invalidTelegramIds.has(judge.id) && (
                <div style={{ position: 'absolute', top: '100%', left: 0, color: '#e53935', fontSize: 12 }}>Поле «Телеграмм» обязательно</div>
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


