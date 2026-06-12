import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { agendas } from '../data/agendas'
import { supabase } from '../lib/supabase'
import { useRole } from '../context/RoleContext'
import { PresentationMode, SlideGridThumb, EMPTY_SLIDES } from '../components/SlideRenderer'
import type { SlideData } from '../components/SlideRenderer'

const REFRESH_INTERVAL = 7000

type SessionRow = {
  policy_id: string
  facilitator_name: string | null
  recorder_name: string | null
  photo_url: string | null
  ai_result: object | null
  is_confirmed: boolean
  tiro_summary: string | null
  slides?: SlideData | null
}

type Opinion = {
  policy_id: string
  agree_content: string | null
  concern: string | null
  improvement: string | null
  first_action: string | null
  key_sentence: string | null
  anonymous_id: string | null
  created_at: string
  nickname: string | null
}

function fmt(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

/* ── Timer Modal ── */
function TimerModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'stopwatch' | 'countdown'>('stopwatch')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [targetMin, setTargetMin] = useState(100)
  const iRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running) {
      iRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (iRef.current) clearInterval(iRef.current)
    }
    return () => { if (iRef.current) clearInterval(iRef.current) }
  }, [running])

  const reset = () => { setRunning(false); setElapsed(0) }

  const display = mode === 'countdown'
    ? Math.max(0, targetMin * 60 - elapsed)
    : elapsed

  const progress = mode === 'countdown' ? Math.min(1, elapsed / (targetMin * 60)) : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#1a2458', borderRadius: 24, padding: '32px 28px',
        width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {(['stopwatch','countdown'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); reset() }} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
              background: mode === m ? '#2dd4bf' : 'transparent',
              color: mode === m ? '#1a2458' : 'rgba(255,255,255,0.5)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              {m === 'stopwatch' ? '경과 시간' : '카운트다운'}
            </button>
          ))}
        </div>

        {/* Countdown minute picker */}
        {mode === 'countdown' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
            <button onClick={() => setTargetMin(m => Math.max(1, m - 10))} style={btnRound}>−</button>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, minWidth: 60, textAlign: 'center' }}>{targetMin}분</span>
            <button onClick={() => setTargetMin(m => m + 10)} style={btnRound}>+</button>
          </div>
        )}

        {/* Time display */}
        <div style={{
          textAlign: 'center', fontSize: 64, fontWeight: 900,
          color: mode === 'countdown' && display < 60 ? '#f87171' : 'white',
          letterSpacing: 2, fontVariantNumeric: 'tabular-nums',
          marginBottom: 8,
        }}>
          {fmt(display)}
        </div>

        {/* Progress bar (countdown only) */}
        {mode === 'countdown' && (
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, height: 4, marginBottom: 16 }}>
            <div style={{ height: 4, borderRadius: 4, background: '#2dd4bf', width: `${progress * 100}%`, transition: 'width 1s linear' }} />
          </div>
        )}

        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>
          {running ? (mode === 'stopwatch' ? '일시 정지 · 경과 시간' : '일시 정지 · 남은 시간') : '▶ 타이머 시작'}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={reset} style={{ ...btnRound, background: 'rgba(255,255,255,0.1)' }}>↺</button>
          <button onClick={() => setRunning(r => !r)} style={{
            width: 64, height: 64, borderRadius: '50%',
            background: running ? 'rgba(255,255,255,0.2)' : '#2dd4bf',
            border: 'none', color: running ? 'white' : '#1a2458',
            fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {running ? '⏸' : '▶'}
          </button>
        </div>

        <button onClick={onClose} style={{
          marginTop: 24, width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
          color: 'rgba(255,255,255,0.5)', borderRadius: 12, padding: '10px 0', cursor: 'pointer', fontSize: 13,
        }}>닫기</button>
      </div>
    </div>
  )
}

const btnRound: React.CSSProperties = {
  width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
  border: 'none', color: 'white', fontSize: 20, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

/* ── Vote Input Modal ── */
function VoteInputModal({
  votes, onSave, onClose,
}: {
  votes: Record<string, number>
  onSave: (v: Record<string, number>) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<Record<string, number>>({ ...votes })
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480,
        padding: '20px 16px 32px', maxHeight: '80vh', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontWeight: 900, color: '#1a2458' }}>우선순위 투표 결과 입력</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agendas.map(a => {
            const num = a.agendaId.replace('policy-', '')
            return (
              <div key={a.agendaId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: '#64748b', width: 200, flexShrink: 0 }}>
                  {num}. {a.title.slice(0, 18)}{a.title.length > 18 ? '…' : ''}
                </span>
                <input
                  type="number"
                  min={0}
                  value={local[a.agendaId] ?? 0}
                  onChange={e => setLocal(prev => ({ ...prev, [a.agendaId]: Number(e.target.value) }))}
                  style={{
                    width: 72, border: '1px solid #e2e8f0', borderRadius: 8,
                    padding: '6px 10px', fontSize: 14, textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: 12, color: '#94a3b8' }}>표</span>
              </div>
            )
          })}
        </div>
        <button onClick={() => { onSave(local); onClose() }} style={{
          marginTop: 16, width: '100%', background: '#1a2458', color: 'white',
          border: 'none', borderRadius: 12, padding: '14px 0', fontWeight: 900, fontSize: 15, cursor: 'pointer',
        }}>저장</button>
      </div>
    </div>
  )
}

/* ── Keyword Cloud ── */
function KeywordCloud({ opinions, selectedPolicy }: { opinions: Opinion[]; selectedPolicy: string }) {
  const filtered = selectedPolicy === 'all'
    ? opinions
    : opinions.filter(o => o.policy_id === selectedPolicy)

  const freq: Record<string, number> = {}
  filtered.forEach(o => {
    const text = [o.agree_content, o.concern, o.improvement].filter(Boolean).join(' ')
    text.split(/\s+/)
      .map(w => w.replace(/[^\w가-힣]/g, ''))
      .filter(w => w.length >= 2 && w.length <= 8)
      .forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  })

  const words = Object.entries(freq)
    .filter(([,c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)

  const max = words[0]?.[1] || 1
  const colors = ['#2dd4bf','#60a5fa','#fbbf24','#34d399','#c084fc','#f87171','#fb923c']

  if (words.length === 0) return (
    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 0' }}>의견 데이터가 없습니다</div>
  )

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', padding: '8px 0' }}>
      {words.map(([w, c], i) => {
        const size = 11 + Math.round((c / max) * 14)
        const color = colors[i % colors.length]
        return (
          <span key={w} style={{
            fontSize: size, fontWeight: c > max * 0.5 ? 900 : 600,
            color, background: `${color}15`, padding: '3px 8px',
            borderRadius: 20, border: `1px solid ${color}40`,
          }}>{w}</span>
        )
      })}
    </div>
  )
}

/* ── Horizontal Bar ── */
function HBar({ label, value, max, color, sub }: { label: string; value: number; max: number; color: string; sub?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{sub ?? value}</span>
      </div>
      <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8 }}>
        <div style={{
          height: 8, borderRadius: 4, background: color,
          width: `${Math.max(pct, 1)}%`, transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

/* ── Opinion Feed ── */
function OpinionFeed({ opinions, selectedPolicy }: { opinions: Opinion[]; selectedPolicy: string }) {
  const filtered = (selectedPolicy === 'all'
    ? [...opinions]
    : opinions.filter(o => o.policy_id === selectedPolicy))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  if (filtered.length === 0) return (
    <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '16px 0' }}>의견이 없습니다</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {filtered.map((o, i) => {
        const num = o.policy_id.replace('policy-', '')
        const agenda = agendas.find(a => a.agendaId === o.policy_id)
        const time = new Date(o.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
        return (
          <div key={i} style={{
            background: 'white', borderRadius: 12, padding: '10px 12px',
            border: '1px solid #f1f5f9',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{
                fontSize: 10, background: '#e0f2fe', color: '#0369a1',
                padding: '1px 7px', borderRadius: 20, fontWeight: 700,
              }}>{num}번 정책</span>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>{time}</span>
            </div>
            {agenda && <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 4px', fontWeight: 600 }}>{agenda.title.slice(0,30)}</p>}
            {o.agree_content && (
              <p style={{ fontSize: 12, color: '#1e293b', margin: 0, lineHeight: 1.5 }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>+ </span>{o.agree_content.slice(0, 80)}{o.agree_content.length > 80 ? '…' : ''}
              </p>
            )}
            {o.concern && (
              <p style={{ fontSize: 12, color: '#1e293b', margin: '2px 0 0', lineHeight: 1.5 }}>
                <span style={{ color: '#f59e0b', fontWeight: 700 }}>△ </span>{o.concern.slice(0, 60)}{o.concern.length > 60 ? '…' : ''}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const { role } = useRole()
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [opinions, setOpinions] = useState<Opinion[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState('')
  const [selectedPolicy, setSelectedPolicy] = useState('all')
  const [votes, setVotes] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem('vote_counts') || '{}') } catch { return {} }
  })
  const [showTimer, setShowTimer] = useState(false)
  const [showVoteInput, setShowVoteInput] = useState(false)
  const [presentingSlides, setPresentingSlides] = useState<{ slides: SlideData; policyNum: string } | null>(null)
  const [activeSection, setActiveSection] = useState<'overview' | 'slides' | 'manage'>('overview')
  const keywordCloudRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: sess }, { data: ops }] = await Promise.all([
        supabase.from('table_sessions').select('*'),
        supabase.from('participant_opinions').select('policy_id, agree_content, concern, improvement, first_action, key_sentence, anonymous_id, created_at, nickname'),
      ])
      if (sess) setSessions(sess)
      if (ops) setOpinions(ops)
      setLastUpdate(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (role !== 'admin') { navigate('/'); return }
    loadData()
    const id = setInterval(loadData, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [role, navigate, loadData])

  const downloadCSV = () => {
    const header = ['번호', '정책ID', '정책명', '닉네임', '익명ID', '공감한내용', '걱정되는점', '보완점', '먼저실행할것', '발표한문장', '제출시각']
    const rows = opinions.map((o, i) => {
      const agenda = agendas.find(a => a.agendaId === o.policy_id)
      const esc = (v: string | null) => `"${(v || '').replace(/"/g, '""')}"`
      return [
        i + 1,
        o.policy_id,
        esc(agenda?.title || ''),
        esc(o.nickname),
        esc(o.anonymous_id),
        esc(o.agree_content),
        esc(o.concern),
        esc(o.improvement),
        esc(o.first_action),
        esc(o.key_sentence),
        new Date(o.created_at).toLocaleString('ko-KR'),
      ].join(',')
    })
    const csv = '﻿' + [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `정책의견_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPhotos = (policyNum: string, photos: string[]) => {
    photos.forEach((dataUrl, i) => {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${policyNum}번_사진_${i + 1}.jpg`
      setTimeout(() => a.click(), i * 300)
    })
  }

  const downloadSlidesPptx = async (policyNum: string, title: string, slides: SlideData) => {
    const pptx = (await import('pptxgenjs')).default
    const prs = new pptx()
    prs.defineLayout({ name: 'WIDE', width: 10, height: 5.63 })
    prs.layout = 'WIDE'

    const colors = ['2dd4bf', '60a5fa', 'fbbf24', '34d399', 'c084fc']
    const labels = ['정책 제목과 핵심 키워드', '왜 이 정책이 필요한가', '시민들이 나눈 이야기', '최종 정책 제안', '기대 효과와 우선 과제']
    const bodies = [
      `${slides.slide1_title}\n${slides.slide1_keywords}`,
      slides.slide2, slides.slide3, slides.slide4, slides.slide5,
    ]

    bodies.forEach((body, i) => {
      const sld = prs.addSlide()
      sld.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 10, h: 5.63, fill: { color: '1a2458' } })
      sld.addShape(prs.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 5.63, fill: { color: colors[i] } })
      sld.addText(`${i + 1}/5`, { x: 8.5, y: 0.2, w: 1.3, h: 0.4, fontSize: 10, color: 'ffffff', align: 'right', bold: false })
      sld.addText(labels[i], { x: 0.4, y: 0.2, w: 8, h: 0.5, fontSize: 11, color: colors[i], bold: true })
      sld.addText(body || '', {
        x: 0.4, y: 0.9, w: 9.2, h: 4.4,
        fontSize: 18, color: 'ffffff', bold: i === 0,
        valign: 'top', wrap: true, paraSpaceAfter: 8,
      })
      sld.addText(`${policyNum}번 정책 · ${title}`, {
        x: 0.4, y: 5.25, w: 9.2, h: 0.3, fontSize: 8, color: '94a3b8',
      })
    })

    prs.writeFile({ fileName: `${policyNum}번_발표슬라이드.pptx` })
  }

  const downloadKeywordCloud = async () => {
    if (!keywordCloudRef.current) return
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(keywordCloudRef.current, { backgroundColor: '#ffffff', scale: 2 })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `키워드클라우드_${selectedPolicy === 'all' ? '전체' : selectedPolicy.replace('policy-', '') + '번'}_${new Date().toISOString().slice(0,10)}.png`
    a.click()
  }

  const saveVotes = (v: Record<string, number>) => {
    setVotes(v)
    localStorage.setItem('vote_counts', JSON.stringify(v))
  }

  const getSession = (pid: string) => sessions.find(s => s.policy_id === pid)

  const opCountMap: Record<string, number> = {}
  opinions.forEach(o => { opCountMap[o.policy_id] = (opCountMap[o.policy_id] || 0) + 1 })

  const totalOpinions = opinions.length
  const totalVotes = Object.values(votes).reduce((s, v) => s + v, 0)
  const confirmedCount = sessions.filter(s => s.is_confirmed).length
  const maxOpCount = Math.max(...Object.values(opCountMap), 1)
  const maxVote = Math.max(...Object.values(votes), 1)

  return (
    <div style={{ minHeight: '100dvh', background: '#f8fafc', fontFamily: 'inherit' }}>

      {/* ── Top Header ── */}
      <div style={{ background: '#1a2458', padding: '12px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            운영 대시보드 · {loading ? '갱신 중...' : `${lastUpdate} 갱신`}
          </span>
          <span style={{ background: '#ef4444', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
            운영진 전용
          </span>
        </div>
        <h1 style={{ color: 'white', fontSize: 17, fontWeight: 900, margin: '0 0 10px' }}>
          전남광주 통합특별시 시민주권 정책공론장
        </h1>

        {/* Action toolbar */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>
          {[
            { icon: '⏱', label: '타이머', action: () => setShowTimer(true) },
            { icon: '🔄', label: '새로고침', action: loadData },
            { icon: '🖥️', label: '발표 슬라이드', action: () => setActiveSection('slides') },
            { icon: '📊', label: '메뉴', action: () => setActiveSection('manage') },
            { icon: '⬇️', label: `의견 CSV (${opinions.length})`, action: downloadCSV },
          ].map(b => (
            <button key={b.label} onClick={b.action} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'white', borderRadius: 10, padding: '7px 12px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span>{b.icon}</span>{b.label}
            </button>
          ))}
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 0, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {[
            { key: 'overview', label: '📊 현황' },
            { key: 'slides', label: '🎞️ 슬라이드' },
            { key: 'manage', label: '🔗 테이블 관리' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveSection(t.key as typeof activeSection)} style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'transparent',
              color: activeSection === t.key ? '#2dd4bf' : 'rgba(255,255,255,0.4)',
              fontWeight: 700, fontSize: 12, cursor: 'pointer',
              borderBottom: `2px solid ${activeSection === t.key ? '#2dd4bf' : 'transparent'}`,
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 80px' }}>

        {/* ── Overview Section ── */}
        {activeSection === 'overview' && (
          <>
            {/* Stats card */}
            <div style={{
              background: '#1a2458', borderRadius: 16, padding: '16px',
              display: 'flex', gap: 0, marginBottom: 16,
            }}>
              <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#2dd4bf' }}>{totalOpinions}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>전체 의견</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#fbbf24' }}>{totalVotes}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>투표</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#34d399' }}>{confirmedCount}/12</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>발표 준비</div>
              </div>
            </div>

            {/* Policy filter chips */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16 }}>
              <button onClick={() => setSelectedPolicy('all')} style={{
                flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                background: selectedPolicy === 'all' ? '#1a2458' : '#f1f5f9',
                color: selectedPolicy === 'all' ? 'white' : '#475569',
              }}>전체</button>
              {agendas.map(a => {
                const num = a.agendaId.replace('policy-', '')
                const sel = selectedPolicy === a.agendaId
                return (
                  <button key={a.agendaId} onClick={() => setSelectedPolicy(a.agendaId)} style={{
                    flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                    border: 'none', cursor: 'pointer',
                    background: sel ? '#2dd4bf' : '#f1f5f9',
                    color: sel ? '#1a2458' : '#475569',
                  }}>{num}번</button>
                )
              })}
            </div>

            {/* 테이블별 의견 수 */}
            <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 900, color: '#1e293b' }}>테이블별 의견 수</h2>
              {agendas.map(a => {
                const num = a.agendaId.replace('policy-', '')
                const cnt = opCountMap[a.agendaId] || 0
                return (
                  <HBar
                    key={a.agendaId}
                    label={`${num}. ${a.title.slice(0, 16)}${a.title.length > 16 ? '…' : ''}`}
                    value={cnt}
                    max={maxOpCount}
                    color="#2dd4bf"
                    sub={`${cnt}건`}
                  />
                )
              })}
            </div>

            {/* 우선순위 투표 */}
            <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#1e293b' }}>우선순위 투표 (마을이)</h2>
                <button onClick={() => setShowVoteInput(true)} style={{
                  background: 'transparent', border: '1px solid #e2e8f0',
                  color: '#f97316', fontWeight: 700, fontSize: 12, padding: '4px 10px',
                  borderRadius: 8, cursor: 'pointer',
                }}>결과 입력</button>
              </div>
              {agendas.map(a => {
                const num = a.agendaId.replace('policy-', '')
                const v = votes[a.agendaId] || 0
                return (
                  <HBar
                    key={a.agendaId}
                    label={`${num}. ${a.title.slice(0, 16)}${a.title.length > 16 ? '…' : ''}`}
                    value={v}
                    max={maxVote}
                    color="#f97316"
                    sub={`${v}표`}
                  />
                )
              })}
            </div>

            {/* 키워드 버블 클라우드 */}
            <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#1e293b' }}>키워드 버블 클라우드</h2>
                <button onClick={downloadKeywordCloud} style={{
                  flexShrink: 0, background: 'transparent', border: '1px solid #e2e8f0',
                  color: '#0369a1', fontWeight: 700, fontSize: 12, padding: '4px 10px',
                  borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>⬇️ 이미지 저장</button>
              </div>
              <div ref={keywordCloudRef} style={{ background: 'white', padding: '8px 4px' }}>
                <KeywordCloud opinions={opinions} selectedPolicy={selectedPolicy} />
              </div>
            </div>

            {/* 실시간 의견 피드 */}
            <div style={{ background: 'white', borderRadius: 16, padding: '16px' }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 900, color: '#1e293b' }}>
                실시간 의견 피드
                <span style={{ marginLeft: 8, fontSize: 12, color: '#94a3b8', fontWeight: 400 }}>
                  {selectedPolicy === 'all' ? `전체 ${opinions.length}건` : `${opCountMap[selectedPolicy] || 0}건`}
                </span>
              </h2>
              <OpinionFeed opinions={opinions} selectedPolicy={selectedPolicy} />
            </div>
          </>
        )}

        {/* ── Slides Section ── */}
        {activeSection === 'slides' && (
          <div>
            <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 900, color: '#1e293b' }}>테이블별 발표 슬라이드</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {agendas.map(agenda => {
                const sess = getSession(agenda.agendaId)
                const slides: SlideData = (sess as any)?.slides ?? EMPTY_SLIDES
                const num = agenda.agendaId.replace('policy-', '')
                const hasSlides = !!(sess as any)?.slides

                return (
                  <div key={agenda.agendaId} style={{
                    background: 'white', borderRadius: 14, padding: '12px',
                    border: '1px solid #f1f5f9', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 3px' }}>{num}번</p>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', margin: '0 0 8px', lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {agenda.title}
                    </p>
                    <SlideGridThumb
                      slides={slides}
                      policyNum={num}
                      onClick={hasSlides ? () => setPresentingSlides({ slides, policyNum: num }) : undefined}
                    />
                    {hasSlides ? (
                      <button
                        onClick={() => setPresentingSlides({ slides, policyNum: num })}
                        style={{
                          marginTop: 8, width: '100%', background: '#1a2458', color: 'white',
                          border: 'none', borderRadius: 8, padding: '7px 0', fontSize: 11,
                          fontWeight: 700, cursor: 'pointer',
                        }}
                      >🖥️ 발표 모드</button>
                    ) : (
                      <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', margin: '8px 0 0', padding: '6px 0' }}>슬라이드 미저장</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Manage Section ── */}
        {activeSection === 'manage' && (
          <div>
            <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 900, color: '#1e293b' }}>12개 정책 진행 현황</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {agendas.map(agenda => {
                const sess = getSession(agenda.agendaId)
                const num = agenda.agendaId.replace('policy-', '')
                const opCount = opCountMap[agenda.agendaId] || 0
                return (
                  <div
                    key={agenda.agendaId}
                    style={{
                      background: 'white', borderRadius: 14, padding: '12px 14px',
                      border: '1px solid #f1f5f9',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{num}번 정책</span>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '2px 0' }}>{agenda.title}</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 10, background: opCount > 0 ? '#e0f2fe' : '#f1f5f9', color: opCount > 0 ? '#0369a1' : '#94a3b8', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
                            의견 {opCount}
                          </span>
                          {sess?.is_confirmed && (
                            <span style={{ fontSize: 10, background: '#d1fae5', color: '#065f46', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>완료</span>
                          )}
                          {(sess as any)?.slides && (
                            <span style={{ fontSize: 10, background: '#ede9fe', color: '#6d28d9', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>슬라이드 ✅</span>
                          )}
                        </div>
                      </div>
                      <Link to={`/operator/${agenda.agendaId}`} style={{ color: '#94a3b8', fontSize: 16, textDecoration: 'none' }}>→</Link>
                    </div>
                    {/* 다운로드 버튼 */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(sess as any)?.photos?.length > 0 && (
                        <button
                          onClick={() => downloadPhotos(num, (sess as any).photos)}
                          style={{
                            flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700,
                            background: '#f0fdf4', color: '#16a34a',
                            border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer',
                          }}
                        >
                          📷 사진 {(sess as any).photos.length}장
                        </button>
                      )}
                      {(sess as any)?.slides && (
                        <button
                          onClick={() => downloadSlidesPptx(num, agenda.title, (sess as any).slides)}
                          style={{
                            flex: 1, padding: '6px 0', fontSize: 11, fontWeight: 700,
                            background: '#f5f3ff', color: '#7c3aed',
                            border: '1px solid #ddd6fe', borderRadius: 8, cursor: 'pointer',
                          }}
                        >
                          🎞️ 슬라이드 PPTX
                        </button>
                      )}
                      {!(sess as any)?.photos?.length && !(sess as any)?.slides && (
                        <span style={{ fontSize: 11, color: '#cbd5e1', padding: '6px 0' }}>저장된 파일 없음</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showTimer && <TimerModal onClose={() => setShowTimer(false)} />}
      {showVoteInput && (
        <VoteInputModal votes={votes} onSave={saveVotes} onClose={() => setShowVoteInput(false)} />
      )}
      {presentingSlides && (
        <PresentationMode
          slides={presentingSlides.slides}
          policyNum={presentingSlides.policyNum}
          onClose={() => setPresentingSlides(null)}
        />
      )}
    </div>
  )
}
