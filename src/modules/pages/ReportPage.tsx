import { useEffect, useMemo, useState } from 'react'
// Using pdfmake for proper Cyrillic support
// @ts-ignore
import pdfMake from 'pdfmake/build/pdfmake'
// @ts-ignore
import pdfFonts from 'pdfmake/build/vfs_fonts'
// Support different bundler shapes
// @ts-ignore
(pdfMake as any).vfs = (pdfFonts as any).vfs || (pdfFonts as any).pdfMake?.vfs
import { useAuth } from '../../modules/auth/AuthContext'

type Judge = { id: string; fullName: string; email?: string }

export default function ReportPage() {
  const { currentUser } = useAuth()
  const [judges, setJudges] = useState<Judge[]>([])
  const [statusById, setStatusById] = useState<Record<string, boolean>>({})
  const [links, setLinks] = useState<Array<{ judgeId: string; token: string; url: string }>>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const user = currentUser || 'guest'
        const res = await fetch(`http://localhost:4000/api/judges?user=${encodeURIComponent(user)}`)
        if (res.ok) {
          const data = await res.json()
          setJudges(Array.isArray(data?.judges) ? data.judges : [])
        }
      } catch {}
      await refreshStatus()
    }
    load()
  }, [currentUser])

  const refreshStatus = async () => {
    try {
      const user = currentUser || 'guest'
      const res = await fetch(`http://localhost:4000/api/report/status?user=${encodeURIComponent(user)}`)
      if (res.ok) {
        const data = await res.json()
        const map: Record<string, boolean> = {}
        for (const s of data.status || []) map[s.judgeId] = !!s.submitted
        setStatusById(map)
      }
    } catch {}
  }

  const handleSendAll = async () => {
    if (sending) return
    setSending(true)
    try {
      const user = currentUser || 'guest'
      const res = await fetch('http://localhost:4000/api/report/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      })
      if (res.ok) {
        const data = await res.json()
        setLinks(data.links || [])
        alert('Ссылки сгенерированы (имитация отправки по email)')
        await refreshStatus()
      } else {
        alert('Не удалось отправить')
      }
    } catch {
      alert('Сервер недоступен')
    } finally {
      setSending(false)
    }
  }

  const initials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/)
    const s = parts.slice(0, 2).map(p => p[0] || '').join('').toUpperCase()
    return s || '??'
  }

  const handleGeneratePdf = async () => {
    try {
      const user = currentUser || 'guest'
      const res = await fetch(`http://localhost:4000/api/report/results?user=${encodeURIComponent(user)}`)
      if (!res.ok) {
        alert('Нет данных для отчета')
        return
      }
      const data = await res.json()
      const stageCols: Array<{ id: string; name: string }> = data.stages || []
      const rows: Array<{ teamId: string; teamName: string; perStage: Record<string, number|null>; total: number; place: number }>= data.rows || []

      const title = 'Итоговый отчет'
      const header = [
        'Номер',
        'Название команды',
        ...stageCols.map(c => (c.name || '').split(' ').join('\n')),
        'Сумма баллов',
        'Место',
      ]
      const body = rows.map(r => [
        String(r.teamNumber ?? ''),
        String(r.teamName ?? ''),
        ...stageCols.map(c => r.perStage[c.id] != null ? String(r.perStage[c.id]) : ''),
        String(r.total ?? ''),
        String(r.place ?? ''),
      ])
      const docDefinition: any = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        pageMargins: [24, 24, 24, 24],
        content: [
          { text: title, style: 'header', margin: [0, 0, 0, 12] },
          {
            table: {
              headerRows: 1,
              widths: [40, '*', ...stageCols.map(()=>'auto'), 60, 40],
              body: [header, ...body],
            },
            layout: {
              hLineWidth: () => 2,
              vLineWidth: () => 2,
              hLineColor: () => '#000',
              vLineColor: () => '#000',
            },
          },
        ],
        styles: {
          header: { fontSize: 16, bold: true },
          tableHeader: { bold: true, alignment: 'center' },
        },
      }
      pdfMake.createPdf(docDefinition).download('report.pdf')
    } catch {
      alert('Ошибка формирования PDF')
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={handleSendAll} disabled={sending} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #0bb783', background: '#0bd18a', color: '#fff', fontWeight: 700 }}>
          Отправить
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {judges.map((j) => {
          const ok = statusById[j.id]
          return (
            <div key={j.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <button style={{ width: 64, height: 64, borderRadius: 12, border: ok ? '1px solid #0bb783' : '1px solid #e5e5ea', background: ok ? '#0bd18a' : '#fff', color: ok ? '#fff' : '#444', fontSize: 20, fontWeight: 700 }}>
                {initials(j.fullName)}
              </button>
              <div style={{ fontSize: 11, textAlign: 'center' }}>{j.fullName}</div>
            </div>
          )
        })}
      </div>

      {links.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>Сгенерированные ссылки:</div>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            {links.map((l) => (
              <li key={l.token} style={{ fontSize: 12 }}>
                <a href={`http://localhost:5173${l.url}`} target="_blank" rel="noreferrer">
                  {`http://localhost:5173${l.url}`}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <button onClick={handleGeneratePdf} style={{ width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 12, border: '1px solid #0bb783', background: '#0bd18a', color: '#fff', fontWeight: 700 }}>
          Отчет
        </button>
      </div>
    </div>
  )
}


