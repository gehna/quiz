import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [judges, setJudges] = useState<Judge[]>([])
  const [statusById, setStatusById] = useState<Record<string, boolean>>({})
  const [links, setLinks] = useState<Array<{ judgeId: string; token: string; url: string }>>([])
  const [sending, setSending] = useState(false)
  const [reportTitle, setReportTitle] = useState<string>('Итоговый отчет')
  const [chiefSignature, setChiefSignature] = useState<string>('')

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
      // Reset all submissions and statuses
      const res = await fetch('http://localhost:4000/api/report/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      })
      if (!res.ok) throw new Error('reset failed')
      setLinks([])
      await refreshStatus()
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

  const openJudgeForm = async (judgeId: string) => {
    try {
      const user = currentUser || 'guest'
      const res = await fetch('http://localhost:4000/api/report/send-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, judgeId }),
      })
      if (!res.ok) {
        alert('Не удалось открыть форму')
        return
      }
      const data = await res.json()
      if (data?.token) {
        navigate(`/s/${data.token}`)
      } else if (data?.url) {
        navigate(data.url.replace(/^https?:\/\/[^/]+/, ''))
      } else {
        alert('Ответ сервера без ссылки')
      }
    } catch {}
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

      const title = reportTitle && reportTitle.trim() ? reportTitle.trim() : 'Итоговый отчет'

      // Helper: render rotated header text (90°) into dataURL image with two-line wrap
      const renderRotated = (text: string) => {
        const t = (text || '').trim()
        const fontSize = 12 // match defaultStyle fontSize
        const padding = 6
        const lineGap = 2
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        ctx.font = `${fontSize}px Roboto, sans-serif`

        // Wrap into up to two lines by words
        const words = t.split(/\s+/).filter(Boolean)
        let line1 = ''
        let line2 = ''
        // If starts with "N. ..." where N in 1..100, keep "N." glued to the next word
        const matchNumDot = /^\s*(\d{1,3})\.\s*(.+)$/.exec(t)
        if (matchNumDot) {
          const n = Number(matchNumDot[1])
          const rest = matchNumDot[2]
          if (n >= 1 && n <= 100) {
            const restWords = rest.split(/\s+/).filter(Boolean)
            if (restWords.length === 0) {
              line1 = t
            } else {
              const prefix = `${n}. ${restWords[0]}`
              const remainder = restWords.slice(1).join(' ')
              // Try to put prefix + as much as fits on line1 (but prefix must stay intact)
              const fullWidth = Math.ceil(ctx.measureText(t).width) || 1
              const maxLine1 = Math.max(40, Math.floor(fullWidth * 0.7))
              let acc = prefix
              if (ctx.measureText(acc).width > maxLine1) {
                // prefix alone is too wide → keep whole text on one line to avoid splitting prefix
                line1 = t
              } else if (!remainder) {
                line1 = acc
                line2 = ''
              } else {
                const remWords = remainder.split(/\s+/).filter(Boolean)
                for (let i = 0; i < remWords.length; i++) {
                  const test = acc + ' ' + remWords[i]
                  if (ctx.measureText(test).width <= maxLine1) {
                    acc = test
                  } else {
                    line1 = acc
                    line2 = remWords.slice(i).join(' ')
                    break
                  }
                }
                if (!line1) {
                  line1 = acc
                  line2 = ''
                }
              }
            }
          } else if (words.length <= 1) {
            line1 = t
          }
        }
        if (!line1 && !line2) {
          if (words.length <= 1) {
            line1 = t
          } else {
            // Greedy fill line1 up to ~70% of full width, rest to line2
            let acc = ''
            const fullWidth = Math.ceil(ctx.measureText(t).width) || 1
            const maxLine1 = Math.max(40, Math.floor(fullWidth * 0.7))
            for (let i = 0; i < words.length; i++) {
              const test = acc ? acc + ' ' + words[i] : words[i]
              if (ctx.measureText(test).width <= maxLine1) {
                acc = test
              } else {
                // stop and push remainder to line2
                line1 = acc || words[i]
                line2 = words.slice(i + (acc ? 0 : 1)).join(' ')
                break
              }
            }
            if (!line1) line1 = acc
            if (!line2 && acc && acc.length < t.length) {
              const used = line1.length
              if (used < t.length) line2 = t.slice(used).trim()
            }
            if (!line2) line2 = ''
          }
        }

        const lines = line2 ? [line1, line2] : [line1]
        const lineHeigthPx = fontSize + lineGap
        const maxLineWidth = Math.max(...lines.map(l => Math.ceil(ctx.measureText(l).width)))
        const totalLinesHeight = lines.length * lineHeigthPx

        // After rotation, width/height swap
        canvas.width = totalLinesHeight + padding * 2
        canvas.height = maxLineWidth + padding * 2
        const cx = canvas.getContext('2d')!
        cx.fillStyle = '#000'
        cx.font = `${fontSize}px Roboto, sans-serif`
        cx.translate(canvas.width / 2, canvas.height / 2)
        cx.rotate(-Math.PI / 2)
        cx.textAlign = 'center'
        cx.textBaseline = 'middle'
        if (lines.length === 1) {
          cx.fillText(lines[0], 0, 0)
        } else {
          const y0 = -lineHeigthPx / 2
          const y1 = lineHeigthPx / 2
          cx.fillText(lines[0], 0, y0)
          cx.fillText(lines[1], 0, y1)
        }
        return canvas.toDataURL('image/png')
      }

      const header: any[] = [
        'Номер',
        'Название команды',
        ...stageCols.map(c => ({ image: renderRotated(c.name || ''), alignment: 'center', margin: [0, 2, 0, 2] })),
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
        defaultStyle: { fontSize: 12 },
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
          { text: `\nГлавный судья ___________________________________  ${chiefSignature || ''}`, margin: [0, 12, 0, 0] },
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <input
          value={reportTitle}
          onChange={(e) => setReportTitle(e.target.value)}
          placeholder="Заголовок отчета"
          style={{ fontSize: 16, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e5ea' }}
        />
        <input
          value={chiefSignature}
          onChange={(e) => setChiefSignature(e.target.value)}
          placeholder="Подпись"
          style={{ fontSize: 16, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e5ea' }}
        />
      </div>
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
              <button onClick={() => openJudgeForm(j.id)} style={{ width: 64, height: 64, borderRadius: 12, border: ok ? '1px solid #0bb783' : '1px solid #e5e5ea', background: ok ? '#0bd18a' : '#fff', color: ok ? '#fff' : '#444', fontSize: 20, fontWeight: 700 }}>
                {initials(j.fullName)}
              </button>
              <div style={{ fontSize: 11, textAlign: 'center' }}>{j.fullName}</div>
            </div>
          )
        })}
      </div>

      {/* auto-refresh уже есть; кнопка не нужна */}


      <div style={{ marginTop: 24 }}>
        <button onClick={handleGeneratePdf} style={{ width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 12, border: '1px solid #0bb783', background: '#0bd18a', color: '#fff', fontWeight: 700 }}>
          Отчет
        </button>
      </div>
    </div>
  )
}


