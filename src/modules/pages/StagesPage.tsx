import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../modules/auth/AuthContext'

type Stage = {
  id: string
  number: string
  name: string
}

function getStorageKey(user: string | null) {
  return user ? `stages:list:${user}` : 'stages:list:guest'
}

export default function StagesPage() {
  const { currentUser } = useAuth()
  const [stages, setStages] = useState<Stage[]>([])
  const [invalidNumberIds, setInvalidNumberIds] = useState<Set<string>>(new Set())
  const [invalidNameIds, setInvalidNameIds] = useState<Set<string>>(new Set())
  const renumber = (list: Stage[]) => list.map((s, idx) => ({ ...s, number: String(idx + 1) }))


  useEffect(() => {
    async function load() {
      try {
        const user = currentUser || 'guest'
        const res = await fetch(`http://localhost:4000/api/stages?user=${encodeURIComponent(user)}`)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        if (Array.isArray(data?.stages)) {
          setStages(data.stages)
        } else {
          setStages([{ id: crypto.randomUUID(), number: '', name: '' }])
        }
      } catch {
        const raw = localStorage.getItem(getStorageKey(currentUser))
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) setStages(parsed)
          } catch {}
        } else {
          setStages([{ id: crypto.randomUUID(), number: '', name: '' }])
        }
      }
    }
    load()
  }, [currentUser])

  useEffect(() => {
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(stages))
  }, [stages, currentUser])

  const handleAdd = () => {
    setStages((prev) => renumber([...prev, { id: crypto.randomUUID(), number: '', name: '' }]))
  }

  const handleRemove = (id: string) => {
    setStages((prev) => renumber(prev.filter((s) => s.id !== id)))
  }

  const handleChange = (id: string, field: keyof Stage, value: string) => {
    setStages((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      // If user edits numbers manually, keep sequence compact: 1..N without gaps
      if (field === 'number') {
        return renumber(next)
      }
      return next
    })
    if (field === 'number') {
      setInvalidNumberIds((prev) => {
        const next = new Set(prev)
        if (value.trim()) next.delete(id)
        return next
      })
    }
    if (field === 'name') {
      setInvalidNameIds((prev) => {
        const next = new Set(prev)
        if (value.trim()) next.delete(id)
        return next
      })
    }
  }

  const canAddMore = useMemo(() => stages.length < 100, [stages.length])

  const handleSave = async () => {
    const normalized = stages.map((s) => ({ ...s, number: s.number.trim(), name: s.name.trim() }))
    const missingNumber = normalized.filter((s) => !s.number).map((s) => s.id)
    const missingName = normalized.filter((s) => !s.name).map((s) => s.id)
    setInvalidNumberIds(new Set(missingNumber))
    setInvalidNameIds(new Set(missingName))
    if (missingNumber.length || missingName.length) return

    const filtered = normalized.filter((s) => s.number || s.name)
    setStages(filtered.length ? filtered : [{ id: crypto.randomUUID(), number: '', name: '' }])
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(filtered))
    try {
      const user = currentUser || 'guest'
      await fetch('http://localhost:4000/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, stages: filtered }),
      })
      alert('Сохранено')
    } catch {
      alert('Сохранено локально (сервер недоступен)')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ margin: '8px 0 16px' }}>Ввод этапов</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stages.map((stage) => (
          <div
            key={stage.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr auto',
              gap: 8,
              alignItems: 'start',
            }}
          >
            <div style={{ position: 'relative', paddingBottom: 8, minWidth: 0 }}>
              <input
                value={stage.number}
                onChange={(e) => handleChange(stage.id, 'number', e.target.value)}
                placeholder="Номер"
                style={{
                  fontSize: 16,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: invalidNumberIds.has(stage.id) ? '1px solid #e53935' : '1px solid #e5e5ea',
                  minWidth: 0,
                }}
                aria-invalid={invalidNumberIds.has(stage.id)}
              />
              {invalidNumberIds.has(stage.id) && (
                <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, color: '#e53935', fontSize: 11, lineHeight: '11px', margin: 0, whiteSpace: 'nowrap' }}>Обязательно</div>
              )}
            </div>
            <div style={{ position: 'relative', paddingBottom: 8, minWidth: 0 }}>
              <input
                value={stage.name}
                onChange={(e) => handleChange(stage.id, 'name', e.target.value)}
                placeholder="Название этапа"
                style={{
                  fontSize: 16,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: invalidNameIds.has(stage.id) ? '1px solid #e53935' : '1px solid #e5e5ea',
                  minWidth: 0,
                }}
                aria-invalid={invalidNameIds.has(stage.id)}
              />
              {invalidNameIds.has(stage.id) && (
                <div style={{ position: 'absolute', top: 'calc(100% - 1px)', left: 0, color: '#e53935', fontSize: 11, lineHeight: '11px', margin: 0, whiteSpace: 'nowrap' }}>Обязательно</div>
              )}
            </div>
            <button
              aria-label="Удалить"
              onClick={() => handleRemove(stage.id)}
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
            aria-label="Добавить этап"
            title="Добавить этап"
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


