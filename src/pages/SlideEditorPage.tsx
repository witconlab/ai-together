import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAgenda } from '../data/agendas'
import { supabase } from '../lib/supabase'
import {
  SW, SH, HEl, HSlide, Align,
  makeId, defaultTextEl, defaultImageEl, defaultSlide, ACCENT_COLORS,
} from '../types/htmlSlide'

/* ─── constants ─── */
const SNAP_PX = 8
const HANDLE_SIZE = 10
const FONTS = ['Noto Sans KR', 'Arial', 'Georgia', 'Courier New', '나눔고딕', '맑은 고딕']
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80]
const BG_PRESETS = ['#1a2458', '#0f172a', '#1e3a3f', '#2d1b69', '#ffffff', '#f1f5f9', '#18181b', '#7f1d1d', '#14532d', '#1e3a5f']

const THEMES = [
  {
    name: '다크네이비',
    bgs: ['#1a2458','#152040','#1a2458','#12193a','#1a2458'],
    accents: ['#2dd4bf','#60a5fa','#fbbf24','#34d399','#c084fc'],
    textColor: '#ffffff',
  },
  {
    name: '화이트클린',
    bgs: ['#ffffff','#f8fafc','#ffffff','#f1f5f9','#ffffff'],
    accents: ['#0d9488','#2563eb','#d97706','#16a34a','#9333ea'],
    textColor: '#1e293b',
  },
  {
    name: '차콜모던',
    bgs: ['#1e293b','#0f172a','#1e293b','#0f172a','#1e293b'],
    accents: ['#f59e0b','#38bdf8','#f87171','#4ade80','#e879f9'],
    textColor: '#f1f5f9',
  },
]
const HANDLES = [
  { id: 'nw', cx: 0,   cy: 0   }, { id: 'n',  cx: 0.5, cy: 0   }, { id: 'ne', cx: 1,   cy: 0   },
  { id: 'w',  cx: 0,   cy: 0.5 },                                    { id: 'e',  cx: 1,   cy: 0.5 },
  { id: 'sw', cx: 0,   cy: 1   }, { id: 's',  cx: 0.5, cy: 1   }, { id: 'se', cx: 1,   cy: 1   },
]
const CURSOR_MAP: Record<string, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  w: 'w-resize', e: 'e-resize',
  sw: 'sw-resize', s: 's-resize', se: 'se-resize',
}

/* ─── snap helpers ─── */
type Guide = { type: 'v' | 'h'; pos: number }

function snap(
  x: number, y: number, w: number, h: number,
  elId: string, allEls: HEl[]
): { x: number; y: number; guides: Guide[] } {
  const others = allEls.filter(e => e.id !== elId)
  const vc = [0, SW / 3, SW / 2, (SW * 2) / 3, SW, ...others.flatMap(e => [e.x, e.x + e.w / 2, e.x + e.w])]
  const hc = [0, SH / 3, SH / 2, (SH * 2) / 3, SH, ...others.flatMap(e => [e.y, e.y + e.h / 2, e.y + e.h])]
  const guides: Guide[] = []
  const xChecks = [{ p: x, off: 0 }, { p: x + w / 2, off: -w / 2 }, { p: x + w, off: -w }]
  const yChecks = [{ p: y, off: 0 }, { p: y + h / 2, off: -h / 2 }, { p: y + h, off: -h }]
  let sx = x, sy = y
  for (const c of vc) {
    const hit = xChecks.find(k => Math.abs(k.p - c) < SNAP_PX)
    if (hit) { sx = c + hit.off; guides.push({ type: 'v', pos: c }); break }
  }
  for (const c of hc) {
    const hit = yChecks.find(k => Math.abs(k.p - c) < SNAP_PX)
    if (hit) { sy = c + hit.off; guides.push({ type: 'h', pos: c }); break }
  }
  return { x: sx, y: sy, guides }
}

/* ─── slide renderer (shared, used in editor + thumbnail) ─── */
export function SlideRender({
  slide, selectedId, onSelect, onDblClick, editingId,
  onPointerDown, onResizeDown, guides, scale = 1,
}: {
  slide: HSlide; selectedId?: string | null; scale?: number
  onSelect?: (id: string | null) => void
  onDblClick?: (id: string) => void
  editingId?: string | null
  onPointerDown?: (e: React.PointerEvent, id: string) => void
  onResizeDown?: (e: React.PointerEvent, id: string, handle: string) => void
  guides?: Guide[]
}) {
  const sorted = [...slide.elements].sort((a, b) => a.z - b.z)
  return (
    <div
      style={{ width: SW, height: SH, background: slide.bg, position: 'relative', overflow: 'hidden', userSelect: 'none' }}
      onPointerDown={onSelect ? e => { if (e.target === e.currentTarget) onSelect(null) } : undefined}
    >
      {sorted.map(el => {
        const sel = selectedId === el.id
        const editing = editingId === el.id
        return (
          <div
            key={el.id}
            style={{
              position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
              zIndex: el.z, opacity: el.opacity,
              outline: sel ? `${2 / scale}px solid #2dd4bf` : 'none',
              outlineOffset: `${-1 / scale}px`,
              cursor: onPointerDown ? 'move' : 'default',
              background: el.bgColor || 'transparent',
              boxSizing: 'border-box',
            }}
            onPointerDown={onPointerDown ? e => onPointerDown(e, el.id) : undefined}
            onDoubleClick={onDblClick && el.type === 'text' ? () => onDblClick(el.id) : undefined}
          >
            {el.type === 'text' && !editing && (
              <div style={{
                width: '100%', height: '100%',
                fontSize: el.fontSize, fontFamily: el.fontFamily,
                fontWeight: el.bold ? 'bold' : 'normal',
                fontStyle: el.italic ? 'italic' : 'normal',
                textDecoration: el.underline ? 'underline' : 'none',
                color: el.color, textAlign: el.align,
                lineHeight: el.lineHeight,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                padding: 4, boxSizing: 'border-box', overflow: 'hidden',
              }}>{el.text}</div>
            )}
            {el.type === 'image' && el.src && (
              <img src={el.src} draggable={false}
                style={{ width: '100%', height: '100%', objectFit: el.fit || 'contain', display: 'block' }} />
            )}
            {el.type === 'image' && !el.src && (
              <div style={{ width: '100%', height: '100%', background: '#334155',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94a3b8', fontSize: 14 }}>🖼 이미지</div>
            )}
            {/* resize handles */}
            {sel && !editing && onResizeDown && HANDLES.map(h => (
              <div key={h.id}
                style={{
                  position: 'absolute',
                  left: h.cx * el.w - HANDLE_SIZE / 2 / scale,
                  top: h.cy * el.h - HANDLE_SIZE / 2 / scale,
                  width: HANDLE_SIZE / scale, height: HANDLE_SIZE / scale,
                  background: '#2dd4bf', border: `${1 / scale}px solid white`,
                  borderRadius: 2 / scale, cursor: CURSOR_MAP[h.id],
                  zIndex: 9999, boxSizing: 'border-box',
                }}
                onPointerDown={e => { e.stopPropagation(); onResizeDown(e, el.id, h.id) }}
              />
            ))}
          </div>
        )
      })}
      {/* snap guides */}
      {guides?.filter(g => g.type === 'v').map((g, i) => (
        <div key={`v${i}`} style={{ position: 'absolute', left: g.pos, top: 0, width: 1 / scale, height: SH,
          background: '#ef4444', opacity: 0.8, pointerEvents: 'none', zIndex: 99999 }} />
      ))}
      {guides?.filter(g => g.type === 'h').map((g, i) => (
        <div key={`h${i}`} style={{ position: 'absolute', left: 0, top: g.pos, width: SW, height: 1 / scale,
          background: '#ef4444', opacity: 0.8, pointerEvents: 'none', zIndex: 99999 }} />
      ))}
    </div>
  )
}

/* ─── tiny thumbnail ─── */
export function HtmlSlideThumb({ slide, width, active, onClick }: {
  slide: HSlide; width: number; active?: boolean; onClick?: () => void
}) {
  const s = width / SW
  return (
    <button onClick={onClick} style={{
      width, height: SH * s, overflow: 'hidden', borderRadius: 6, flexShrink: 0,
      border: active ? '2px solid #2dd4bf' : '2px solid #e2e8f0',
      padding: 0, cursor: 'pointer', background: 'transparent',
      boxShadow: active ? '0 0 0 2px #2dd4bf40' : 'none',
    }}>
      <div style={{ transform: `scale(${s})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        <SlideRender slide={slide} />
      </div>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════ */
/*  MAIN EDITOR                                                   */
/* ══════════════════════════════════════════════════════════════ */
export default function SlideEditorPage() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const agenda = getAgenda(agendaId || '')
  const navigate = useNavigate()

  const [slides, setSlides] = useState<HSlide[]>(() => Array.from({ length: 5 }, (_, i) => defaultSlide(i)))
  const [curIdx, setCurIdx] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])
  const [opinions, setOpinions] = useState<any[]>([])
  const [tiroSummary, setTiroSummary] = useState('')
  const [tableIntro, setTableIntro] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'pptx' | null>(null)
  const [applyBgAll, setApplyBgAll] = useState(false)

  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  const dragRef = useRef<{
    type: 'move' | 'resize'; elId: string; handle: string
    sx: number; sy: number
    ox: number; oy: number; ow: number; oh: number
  } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const slidesRef = useRef(slides)
  slidesRef.current = slides

  useEffect(() => {
    const update = () => {
      if (canvasContainerRef.current)
        setScale(canvasContainerRef.current.clientWidth / SW)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => { loadData() }, [agendaId])

  const loadData = async () => {
    const [{ data: sess }, { data: ops }] = await Promise.all([
      supabase.from('table_sessions').select('*').eq('policy_id', agendaId).single(),
      supabase.from('participant_opinions').select('*').eq('policy_id', agendaId),
    ])
    if (sess) {
      setTiroSummary(sess.tiro_summary || '')
      setTableIntro(sess.table_intro || agenda?.whyImportant || '')
      if (Array.isArray(sess.html_slides) && sess.html_slides.length > 0) {
        setSlides(sess.html_slides)
      }
    }
    if (ops) setOpinions(ops)
  }

  /* ── slide / element helpers ── */
  const curSlide = slides[curIdx]

  const updateSlides = (fn: (s: HSlide[]) => HSlide[]) =>
    setSlides(prev => fn([...prev]))

  const updateEl = useCallback((id: string, patch: Partial<HEl>) => {
    setSlides(prev => prev.map((sl, i) => i !== curIdx ? sl : {
      ...sl, elements: sl.elements.map(e => e.id === id ? { ...e, ...patch } : e),
    }))
  }, [curIdx])

  const selEl = curSlide.elements.find(e => e.id === selectedId)

  const addText = () => {
    const maxZ = Math.max(0, ...curSlide.elements.map(e => e.z))
    const el = defaultTextEl('새 텍스트', { x: 60, y: 60, z: maxZ + 1 })
    updateSlides(s => s.map((sl, i) => i !== curIdx ? sl : { ...sl, elements: [...sl.elements, el] }))
    setSelectedId(el.id)
    setTimeout(() => setEditingId(el.id), 50)
  }

  const addImage = () => imgInputRef.current?.click()

  const deleteEl = () => {
    if (!selectedId) return
    updateSlides(s => s.map((sl, i) => i !== curIdx ? sl : {
      ...sl, elements: sl.elements.filter(e => e.id !== selectedId),
    }))
    setSelectedId(null)
  }

  const moveLayer = (dir: 1 | -1) => {
    if (!selectedId) return
    updateSlides(s => s.map((sl, i) => {
      if (i !== curIdx) return sl
      const el = sl.elements.find(e => e.id === selectedId)!
      const newZ = Math.max(1, el.z + dir)
      return { ...sl, elements: sl.elements.map(e => e.id === selectedId ? { ...e, z: newZ } : e) }
    }))
  }

  const setBg = (color: string) => {
    if (applyBgAll) {
      setSlides(prev => prev.map(sl => ({ ...sl, bg: color })))
    } else {
      updateSlides(s => s.map((sl, i) => i !== curIdx ? sl : { ...sl, bg: color }))
    }
  }

  /* ── drag / resize pointer events ── */
  const handlePointerDown = useCallback((e: React.PointerEvent, elId: string) => {
    if (editingId) return
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setSelectedId(elId)
    const el = slidesRef.current[curIdx].elements.find(e2 => e2.id === elId)!
    dragRef.current = {
      type: 'move', elId, handle: '',
      sx: e.clientX, sy: e.clientY,
      ox: el.x, oy: el.y, ow: el.w, oh: el.h,
    }
  }, [editingId, curIdx])

  const handleResizeDown = useCallback((e: React.PointerEvent, elId: string, handle: string) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    const el = slidesRef.current[curIdx].elements.find(e2 => e2.id === elId)!
    dragRef.current = {
      type: 'resize', elId, handle,
      sx: e.clientX, sy: e.clientY,
      ox: el.x, oy: el.y, ow: el.w, oh: el.h,
    }
  }, [curIdx])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = (e.clientX - d.sx) / scale
    const dy = (e.clientY - d.sy) / scale
    const el = slidesRef.current[curIdx].elements.find(e2 => e2.id === d.elId)!

    if (d.type === 'move') {
      const nx = Math.max(0, Math.min(SW - el.w, d.ox + dx))
      const ny = Math.max(0, Math.min(SH - el.h, d.oy + dy))
      const snapped = snap(nx, ny, el.w, el.h, d.elId, slidesRef.current[curIdx].elements)
      updateEl(d.elId, { x: snapped.x, y: snapped.y })
      setGuides(snapped.guides)
    } else {
      const h = d.handle
      let nx = d.ox, ny = d.oy, nw = d.ow, nh = d.oh
      if (h.includes('e')) nw = Math.max(40, d.ow + dx)
      if (h.includes('s')) nh = Math.max(20, d.oh + dy)
      if (h.includes('w')) { nw = Math.max(40, d.ow - dx); nx = d.ox + d.ow - nw }
      if (h.includes('n')) { nh = Math.max(20, d.oh - dy); ny = d.oy + d.oh - nh }
      updateEl(d.elId, { x: nx, y: ny, w: nw, h: nh })
    }
  }, [scale, curIdx, updateEl])

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
    setGuides([])
  }, [])

  /* ── text editing ── */
  const handleDblClick = (id: string) => {
    setEditingId(id)
    setTimeout(() => textareaRef.current?.focus(), 30)
  }

  const commitEdit = () => {
    if (editingId && textareaRef.current) {
      updateEl(editingId, { text: textareaRef.current.value })
    }
    setEditingId(null)
  }

  /* ── AI generation ── */
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const title = agenda?.title || ''
      const keywords = (agenda?.tags || []).slice(0, 6)
      const agreeOps = opinions.filter(o => o.agree_content).slice(0, 3).map(o => o.agree_content)
      const concerns = opinions.filter(o => o.concern).slice(0, 2).map(o => o.concern)
      const improves = opinions.filter(o => o.improvement).slice(0, 3).map(o => o.improvement)
      const firstActs = opinions.filter(o => o.first_action).slice(0, 2).map(o => o.first_action)
      const keySents = opinions.filter(o => o.key_sentence).slice(0, 3).map(o => `"${o.key_sentence}"`)

      const slideContents = [
        { label: '정책 제목과 핵심 키워드', body: keywords.join('\n') || title },
        { label: '왜 이 정책이 필요한가',   body: [tableIntro || agenda?.whyImportant, ...agreeOps.map(t => `✅ "${t}"`)].filter(Boolean).join('\n') },
        { label: '시민들이 나눈 이야기',     body: tiroSummary || [...agreeOps.map(t=>`✅ ${t}`), ...concerns.map(t=>`⚠️ ${t}`), ...improves.map(t=>`💡 ${t}`)].join('\n') || '시민들이 다양한 의견을 나눴습니다.' },
        { label: '최종 정책 제안',           body: [...improves, ...firstActs.map(t => `[우선실행] ${t}`)].join('\n') || `${title} 실현을 위한 제도 정비\n주민 참여 기구 구성\n단계별 시범사업 추진` },
        { label: '기대 효과와 우선 과제',    body: [agenda?.expectedEffect, ...keySents].filter(Boolean).join('\n') || '주민 자치 역량 강화\n지역 현안 해결' },
      ]

      const newSlides: HSlide[] = slideContents.map((sc, i) => {
        const accent = ACCENT_COLORS[i]
        const bg = slides[i]?.bg || '#1a2458'
        const isFirst = i === 0
        const mainText = isFirst ? title : sc.body
        const subText = isFirst ? sc.body : ''
        const els: HEl[] = [
          defaultTextEl(sc.label, { id: makeId(), x: 40, y: 18, w: 880, h: 50, fontSize: 13, color: accent, bold: true, z: 2 }),
          defaultTextEl(mainText, {
            id: makeId(), x: 40, y: 78, w: 880, h: isFirst ? 320 : 390,
            fontSize: isFirst ? 40 : 21, color: '#ffffff', bold: isFirst,
            z: 1, lineHeight: isFirst ? 1.3 : 1.75,
          }),
        ]
        if (isFirst && subText) {
          els.push(defaultTextEl(subText, {
            id: makeId(), x: 40, y: 420, w: 880, h: 80,
            fontSize: 14, color: accent, z: 3,
          }))
        }
        return { id: slides[i]?.id || makeId(), bg, elements: els }
      })

      setSlides(newSlides)
      setCurIdx(0)
      setSelectedId(null)
    } finally {
      setGenerating(false)
    }
  }

  /* ── theme apply ── */
  const applyTheme = (t: typeof THEMES[0]) => {
    setSlides(prev => prev.map((sl, i) => ({
      ...sl,
      bg: t.bgs[i] ?? t.bgs[0],
      elements: sl.elements.map(el => {
        if (el.type !== 'text') return el
        const isLabel = el.fontSize <= 16
        return { ...el, color: isLabel ? t.accents[i] ?? t.accents[0] : t.textColor }
      }),
    })))
  }

  /* ── save ── */
  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('table_sessions')
        .upsert({ policy_id: agendaId, html_slides: slides, is_confirmed: true }, { onConflict: 'policy_id' })
      if (error) throw new Error(error.message)
      alert('저장되었습니다.')
    } catch (err: unknown) {
      alert(`저장 실패: ${err instanceof Error ? err.message : String(err)}`)
    } finally { setSaving(false) }
  }

  /* ── PDF export ── */
  const handlePDF = async () => {
    setExporting('pdf')
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [SW, SH] })
      const container = document.createElement('div')
      container.style.cssText = `position:fixed;left:-9999px;top:0;width:${SW}px;height:${SH}px;z-index:-1`
      document.body.appendChild(container)

      for (let i = 0; i < slides.length; i++) {
        const sl = slides[i]
        container.innerHTML = ''
        const wrapper = document.createElement('div')
        wrapper.style.cssText = `width:${SW}px;height:${SH}px;background:${sl.bg};position:relative;overflow:hidden;font-family:'Noto Sans KR',sans-serif`
        const sorted = [...sl.elements].sort((a, b) => a.z - b.z)
        for (const el of sorted) {
          const div = document.createElement('div')
          div.style.cssText = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px;z-index:${el.z};opacity:${el.opacity};background:${el.bgColor||'transparent'};box-sizing:border-box`
          if (el.type === 'text') {
            div.style.cssText += `;font-size:${el.fontSize}px;font-family:${el.fontFamily};font-weight:${el.bold?'bold':'normal'};font-style:${el.italic?'italic':'normal'};text-decoration:${el.underline?'underline':'none'};color:${el.color};text-align:${el.align};line-height:${el.lineHeight};white-space:pre-wrap;word-break:break-word;padding:4px`
            div.textContent = el.text
          } else if (el.src) {
            const img = document.createElement('img')
            img.src = el.src
            img.style.cssText = `width:100%;height:100%;object-fit:${el.fit||'contain'}`
            div.appendChild(img)
          }
          wrapper.appendChild(div)
        }
        container.appendChild(wrapper)
        await new Promise(r => setTimeout(r, 200))
        const canvas = await html2canvas(wrapper, { scale: 1.5, useCORS: true, allowTaint: true })
        const img = canvas.toDataURL('image/jpeg', 0.92)
        if (i > 0) pdf.addPage()
        pdf.addImage(img, 'JPEG', 0, 0, SW, SH)
      }
      document.body.removeChild(container)
      pdf.save(`${agendaId?.replace('policy-', '') || ''}번_발표슬라이드.pdf`)
    } catch (e) { console.error(e); alert('PDF 내보내기 실패') }
    finally { setExporting(null) }
  }

  /* ── PPTX export ── */
  const handlePPTX = async () => {
    setExporting('pptx')
    try {
      const { default: pptx } = await import('pptxgenjs')
      const prs = new pptx()
      prs.defineLayout({ name: 'WIDE', width: 10, height: 5.63 })
      prs.layout = 'WIDE'
      const scX = 10 / SW
      const scY = 5.63 / SH

      for (const sl of slides) {
        const sld = prs.addSlide()
        sld.background = { color: sl.bg.replace('#', '') || '1a2458' }
        const sorted = [...sl.elements].sort((a, b) => a.z - b.z)
        for (const el of sorted) {
          const x = el.x * scX, y = el.y * scY
          const w = el.w * scX, h = el.h * scY
          if (el.type === 'text' && el.text) {
            sld.addText(el.text, {
              x, y, w, h,
              fontSize: Math.round(el.fontSize * 0.75),
              fontFace: el.fontFamily.includes('KR') ? 'Arial' : el.fontFamily,
              bold: el.bold, italic: el.italic, underline: { style: el.underline ? 'sng' : 'none' },
              color: el.color.replace('#', ''),
              align: el.align as any,
              valign: 'top', wrap: true,
              paraSpaceAfter: 4,
              lineSpacingMultiple: el.lineHeight,
            })
          } else if (el.type === 'image' && el.src) {
            try {
              sld.addImage({ data: el.src, x, y, w, h, sizing: { type: el.fit === 'cover' ? 'crop' : 'contain', w, h } })
            } catch { /* skip failed images */ }
          }
        }
      }
      await prs.writeFile({ fileName: `${agendaId?.replace('policy-', '') || ''}번_발표슬라이드.pptx` })
    } catch (e) { console.error(e); alert('PPTX 내보내기 실패') }
    finally { setExporting(null) }
  }

  /* ── image upload ── */
  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const maxZ = Math.max(0, ...curSlide.elements.map(e2 => e2.z))
      const el = defaultImageEl(src, { z: maxZ + 1, w: 400, h: 280 })
      updateSlides(s => s.map((sl, i) => i !== curIdx ? sl : { ...sl, elements: [...sl.elements, el] }))
      setSelectedId(el.id)
    }
    reader.readAsDataURL(file)
  }

  const policyNum = agendaId?.replace('policy-', '')

  /* ── render ── */
  return (
    <div style={{ minHeight: '100dvh', background: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

      {/* ── 상단 헤더 ── */}
      <div style={{ background: '#1e293b', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, borderBottom: '1px solid #334155' }}>
        <button onClick={() => navigate(`/operator/${agendaId}`)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}>←</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>{policyNum}번 정책</p>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {agenda?.title || 'HTML 슬라이드 편집기'}
          </p>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          style={{ background: generating ? '#1e3a3f' : '#0d9488', border: 'none', color: 'white', fontWeight: 700, fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {generating ? '생성중…' : '🤖 AI 초안'}
        </button>
        <button onClick={handlePDF} disabled={!!exporting}
          style={{ background: '#dc2626', border: 'none', color: 'white', fontWeight: 700, fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {exporting === 'pdf' ? '…' : '⬇PDF'}
        </button>
        <button onClick={handlePPTX} disabled={!!exporting}
          style={{ background: '#7c3aed', border: 'none', color: 'white', fontWeight: 700, fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {exporting === 'pptx' ? '…' : '⬇PPTX'}
        </button>
        <button onClick={handleSave} disabled={saving}
          style={{ background: '#2dd4bf', border: 'none', color: '#0f172a', fontWeight: 900, fontSize: 11, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {saving ? '…' : '저장'}
        </button>
      </div>

      {/* ── 슬라이드 스트립 ── */}
      <div style={{ background: '#1e293b', padding: '8px 10px', display: 'flex', gap: 8, overflowX: 'auto', flexShrink: 0, borderBottom: '1px solid #334155' }}>
        {slides.map((sl, i) => (
          <div key={sl.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <HtmlSlideThumb slide={sl} width={96} active={i === curIdx}
              onClick={() => { setCurIdx(i); setSelectedId(null); setEditingId(null) }} />
            <span style={{ fontSize: 10, color: i === curIdx ? '#2dd4bf' : '#64748b', fontWeight: 700 }}>{i + 1}장</span>
          </div>
        ))}
      </div>

      {/* ── 테마 선택 ── */}
      <div style={{ background: '#162032', padding: '6px 10px', display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, borderBottom: '1px solid #334155' }}>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, flexShrink: 0 }}>테마</span>
        {THEMES.map(t => (
          <button key={t.name} onClick={() => applyTheme(t)} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: t.bgs[0], border: `2px solid ${t.accents[0]}`,
            color: t.textColor, borderRadius: 8, padding: '4px 10px',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}>{t.name}</button>
        ))}
        <span style={{ fontSize: 10, color: '#475569', marginLeft: 4 }}>← 클릭하면 모든 슬라이드에 적용</span>
      </div>

      {/* ── 툴바 ── */}
      <div style={{ background: '#1e293b', padding: '6px 10px', display: 'flex', gap: 6, overflowX: 'auto', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid #334155' }}>
        {/* 요소 추가 */}
        <button onClick={addText} style={tbBtn('#334155', '#e2e8f0')}>T 텍스트</button>
        <button onClick={addImage} style={tbBtn('#334155', '#e2e8f0')}>🖼 이미지</button>
        {selectedId && <button onClick={deleteEl} style={tbBtn('#7f1d1d', '#fca5a5')}>🗑 삭제</button>}
        <div style={{ width: 1, height: 24, background: '#334155', flexShrink: 0 }} />

        {/* 텍스트 속성 (텍스트 선택 시) */}
        {selEl?.type === 'text' && <>
          <select value={selEl.fontFamily} onChange={e => updateEl(selEl.id, { fontFamily: e.target.value })}
            style={selStyle}>
            {FONTS.map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={selEl.fontSize} onChange={e => updateEl(selEl.id, { fontSize: +e.target.value })}
            style={{ ...selStyle, width: 60 }}>
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => updateEl(selEl.id, { bold: !selEl.bold })}
            style={tbBtn(selEl.bold ? '#2dd4bf' : '#334155', selEl.bold ? '#0f172a' : '#e2e8f0')}>B</button>
          <button onClick={() => updateEl(selEl.id, { italic: !selEl.italic })}
            style={tbBtn(selEl.italic ? '#2dd4bf' : '#334155', selEl.italic ? '#0f172a' : '#e2e8f0')}><i>I</i></button>
          <button onClick={() => updateEl(selEl.id, { underline: !selEl.underline })}
            style={tbBtn(selEl.underline ? '#2dd4bf' : '#334155', selEl.underline ? '#0f172a' : '#e2e8f0')}><u>U</u></button>
          {(['left','center','right'] as Align[]).map(a => (
            <button key={a} onClick={() => updateEl(selEl.id, { align: a })}
              style={tbBtn(selEl.align === a ? '#2dd4bf' : '#334155', selEl.align === a ? '#0f172a' : '#e2e8f0')}>
              {a === 'left' ? '≡' : a === 'center' ? '≡' : '≡'}
            </button>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11, flexShrink: 0 }}>
            글자색
            <input type="color" value={selEl.color} onChange={e => updateEl(selEl.id, { color: e.target.value })}
              style={{ width: 28, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11, flexShrink: 0 }}>
            박스색
            <input type="color" value={selEl.bgColor === 'transparent' ? '#000000' : selEl.bgColor}
              onChange={e => updateEl(selEl.id, { bgColor: e.target.value })}
              style={{ width: 28, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }} />
          </label>
          <div style={{ width: 1, height: 24, background: '#334155', flexShrink: 0 }} />
        </>}

        {/* 공통: 투명도, 레이어 */}
        {selEl && <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11, flexShrink: 0 }}>
            투명도
            <input type="range" min={0} max={1} step={0.05} value={selEl.opacity}
              onChange={e => updateEl(selEl.id, { opacity: +e.target.value })}
              style={{ width: 70 }} />
            <span style={{ color: '#e2e8f0', fontSize: 11, width: 28 }}>{Math.round(selEl.opacity * 100)}%</span>
          </label>
          <button onClick={() => moveLayer(1)} style={tbBtn('#334155', '#e2e8f0')} title="레이어 앞으로">↑레이어</button>
          <button onClick={() => moveLayer(-1)} style={tbBtn('#334155', '#e2e8f0')} title="레이어 뒤로">↓레이어</button>
          <div style={{ width: 1, height: 24, background: '#334155', flexShrink: 0 }} />
        </>}

        {/* 배경색 */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11, flexShrink: 0 }}>
          배경
          <input type="color" value={curSlide.bg} onChange={e => setBg(e.target.value)}
            style={{ width: 28, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }} />
        </label>
        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
          {BG_PRESETS.map(c => (
            <button key={c} onClick={() => setBg(c)} style={{
              width: 20, height: 20, background: c, border: curSlide.bg === c ? '2px solid #2dd4bf' : '1px solid #475569',
              borderRadius: 4, cursor: 'pointer', flexShrink: 0,
            }} />
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11, flexShrink: 0, cursor: 'pointer' }}>
          <input type="checkbox" checked={applyBgAll} onChange={e => setApplyBgAll(e.target.checked)} />
          전체적용
        </label>
      </div>

      {/* ── 캔버스 ── */}
      <div style={{ flex: 1, padding: 12, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div ref={canvasContainerRef} style={{ width: '100%', maxWidth: 800 }}>
          <div
            style={{ width: '100%', height: SH * scale, overflow: 'hidden', borderRadius: 6, boxShadow: '0 8px 40px rgba(0,0,0,0.6)', cursor: 'default' }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', position: 'relative' }}>
              <SlideRender
                slide={curSlide}
                selectedId={editingId ? null : selectedId}
                editingId={editingId}
                onSelect={id => { if (!editingId) { setSelectedId(id); setEditingId(null) } }}
                onDblClick={handleDblClick}
                onPointerDown={handlePointerDown}
                onResizeDown={handleResizeDown}
                guides={guides}
                scale={scale}
              />
              {/* inline text editor */}
              {editingId && (() => {
                const el = curSlide.elements.find(e => e.id === editingId)
                if (!el || el.type !== 'text') return null
                return (
                  <textarea
                    ref={textareaRef}
                    defaultValue={el.text}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === 'Escape') { setEditingId(null) } }}
                    style={{
                      position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
                      fontSize: el.fontSize, fontFamily: el.fontFamily,
                      fontWeight: el.bold ? 'bold' : 'normal',
                      color: el.color, textAlign: el.align,
                      lineHeight: String(el.lineHeight),
                      background: el.bgColor === 'transparent' ? 'rgba(255,255,255,0.05)' : el.bgColor,
                      border: '2px solid #2dd4bf', borderRadius: 2,
                      padding: 4, resize: 'none', zIndex: 99999,
                      outline: 'none', boxSizing: 'border-box',
                      whiteSpace: 'pre-wrap',
                    }}
                  />
                )
              })()}
            </div>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 6 }}>
            클릭 선택 · 드래그 이동 · 더블클릭 텍스트편집 · 핸들 리사이즈 · 빨간선 = 스냅가이드
          </p>
        </div>

        {/* 선택된 요소 위치/크기 패널 */}
        {selEl && !editingId && (
          <div style={{ width: '100%', maxWidth: 800, marginTop: 10, background: '#1e293b', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'X', key: 'x' as const }, { label: 'Y', key: 'y' as const },
              { label: 'W', key: 'w' as const }, { label: 'H', key: 'h' as const },
            ].map(({ label, key }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#94a3b8', fontSize: 11 }}>
                {label}
                <input type="number" value={Math.round(selEl[key])}
                  onChange={e => updateEl(selEl.id, { [key]: +e.target.value })}
                  style={{ width: 56, background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 4, padding: '3px 6px', fontSize: 11 }}
                />
              </label>
            ))}
            <span style={{ fontSize: 11, color: '#475569' }}>Z: {selEl.z}</span>
            {selEl.type === 'text' && (
              <button onClick={() => handleDblClick(selEl.id)}
                style={{ ...tbBtn('#0d9488', '#ffffff'), marginLeft: 'auto', fontSize: 11 }}>
                ✏️ 텍스트 편집
              </button>
            )}
          </div>
        )}
      </div>

      <input type="file" accept="image/*" ref={imgInputRef} className="hidden" onChange={handleImgUpload} />
    </div>
  )
}

/* ── style helpers ── */
function tbBtn(bg: string, color: string): React.CSSProperties {
  return {
    background: bg, color, border: 'none', borderRadius: 6,
    padding: '5px 8px', fontSize: 11, fontWeight: 700,
    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
  }
}
const selStyle: React.CSSProperties = {
  background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0',
  borderRadius: 6, padding: '4px 6px', fontSize: 11, flexShrink: 0,
}
