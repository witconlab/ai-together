import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAgenda } from '../data/agendas'
import { supabase } from '../lib/supabase'
import { useRole } from '../context/RoleContext'
import { PresentationMode } from '../components/SlideRenderer'

type SlideKey = 'slide1' | 'slide2' | 'slide3' | 'slide4' | 'slide5'
type ThemeId = 0 | 1 | 2

type Slides = {
  slide1_title: string
  slide1_keywords: string
  slide2: string
  slide3: string
  slide4: string
  slide5: string
}

const SLIDE_TABS: { key: SlideKey; num: number; label: string; accent: string }[] = [
  { key: 'slide1', num: 1, label: '정책 제목 · 키워드',       accent: '#2dd4bf' },
  { key: 'slide2', num: 2, label: '왜 이 정책이 필요한가',     accent: '#60a5fa' },
  { key: 'slide3', num: 3, label: '시민들이 나눈 이야기',       accent: '#fbbf24' },
  { key: 'slide4', num: 4, label: '최종 정책 제안',            accent: '#34d399' },
  { key: 'slide5', num: 5, label: '기대 효과와 우선 과제',      accent: '#c084fc' },
]

/* ── 3가지 디자인 테마 ── */
const THEMES: {
  id: ThemeId; name: string; preview: string
  bg: string; bg2: string; text: string; sub: string; card: string
}[] = [
  {
    id: 0, name: '다크 네이비', preview: '#1a2458',
    bg: '#1a2458', bg2: 'rgba(255,255,255,0.04)', text: '#ffffff', sub: 'rgba(255,255,255,0.55)', card: 'rgba(255,255,255,0.07)',
  },
  {
    id: 1, name: '화이트 클린', preview: '#ffffff',
    bg: '#ffffff', bg2: '#f8fafc', text: '#1e293b', sub: '#64748b', card: '#f1f5f9',
  },
  {
    id: 2, name: '차콜 모던', preview: '#0f172a',
    bg: '#0f172a', bg2: 'rgba(255,255,255,0.03)', text: '#f1f5f9', sub: 'rgba(255,255,255,0.45)', card: 'rgba(255,255,255,0.06)',
  },
]

/* ── 슬라이드 렌더 (640×360 고정) ── */
function SlideBody({ slides, activeKey, theme, policyNum }: {
  slides: Slides; activeKey: SlideKey; theme: ThemeId; policyNum?: string
}) {
  const idx = SLIDE_TABS.findIndex(t => t.key === activeKey)
  const cfg = SLIDE_TABS[idx]
  const th = THEMES[theme]
  const keywords = slides.slide1_keywords?.split('\n').filter(Boolean) ?? []
  const bodyMap: Record<SlideKey, string> = {
    slide1: '', slide2: slides.slide2, slide3: slides.slide3,
    slide4: slides.slide4, slide5: slides.slide5,
  }
  const body = bodyMap[activeKey]
  const points = body ? body.split('\n').filter(s => s.trim().length > 1) : []
  const accentBg = cfg.accent + (theme === 1 ? '18' : '22')
  const isLight = theme === 1

  return (
    <div style={{
      width: 640, height: 360, background: th.bg,
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      fontFamily: 'Noto Sans KR, sans-serif',
      ...(theme === 2 ? {
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
      } : {}),
    }}>
      {/* 테마별 장식 요소 */}
      {theme === 0 && (
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200,
          borderRadius: '50%', background: accentBg, pointerEvents: 'none' }} />
      )}
      {theme === 1 && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6,
          background: cfg.accent, pointerEvents: 'none' }} />
      )}
      {theme === 2 && (
        <>
          <div style={{ position: 'absolute', bottom: -40, right: -40, width: 160, height: 160,
            borderRadius: '50%', background: cfg.accent + '15', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100,
            borderRadius: '50%', background: cfg.accent + '10', pointerEvents: 'none' }} />
        </>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
        padding: theme === 1 ? '22px 36px 24px' : '28px 36px', position: 'relative' }}>

        {/* Badge row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexShrink: 0 }}>
          <span style={{
            background: isLight ? cfg.accent : accentBg,
            color: isLight ? '#fff' : cfg.accent,
            fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20,
            border: isLight ? 'none' : `1px solid ${cfg.accent}60`,
          }}>{idx + 1}장</span>
          <span style={{ color: th.sub, fontSize: 10, fontWeight: 600 }}>{cfg.label}</span>
          {policyNum && (
            <span style={{ marginLeft: 'auto', color: th.sub, fontSize: 9, opacity: 0.6 }}>
              정책 {policyNum}
            </span>
          )}
        </div>

        {/* Slide 1: 제목 + 키워드 */}
        {activeKey === 'slide1' && (
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ color: th.text, fontSize: 28, fontWeight: 900, lineHeight: 1.3 }}>
                {slides.slide1_title || '정책 제목을 입력하세요'}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
              {keywords.length > 0
                ? keywords.map((kw, i) => (
                    <span key={i} style={{
                      background: accentBg, color: cfg.accent,
                      border: `1px solid ${cfg.accent}${isLight ? '' : '80'}`,
                      fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 700,
                    }}>{kw}</span>
                  ))
                : <span style={{ color: th.sub, fontSize: 11 }}>키워드를 입력하세요</span>
              }
            </div>
          </>
        )}

        {/* Slide 2~5: 본문 */}
        {activeKey !== 'slide1' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {points.length > 0 ? (
              theme === 1
                ? /* 카드형 (화이트 테마) */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {points.slice(0, 5).map((p, i) => (
                      <div key={i} style={{
                        background: i === 0 ? cfg.accent + '15' : th.card,
                        borderLeft: `3px solid ${cfg.accent}`,
                        borderRadius: '0 8px 8px 0', padding: '8px 14px',
                      }}>
                        <span style={{ color: th.text, fontSize: 13, lineHeight: 1.55 }}>{p}</span>
                      </div>
                    ))}
                  </div>
                : /* 불릿형 (다크/차콜 테마) */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {points.slice(0, 5).map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ color: cfg.accent, fontSize: 14, flexShrink: 0, marginTop: 1 }}>▸</span>
                        <span style={{ color: th.text, fontSize: 13, lineHeight: 1.65 }}>{p}</span>
                      </div>
                    ))}
                  </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', color: th.sub, fontSize: 13, opacity: 0.5 }}>
                내용을 입력하세요
              </div>
            )}
          </div>
        )}
      </div>

      {/* 하단 바 */}
      <div style={{
        height: 28, background: isLight ? cfg.accent + '10' : 'rgba(255,255,255,0.04)',
        borderTop: `1px solid ${isLight ? cfg.accent + '20' : 'rgba(255,255,255,0.07)'}`,
        display: 'flex', alignItems: 'center', paddingLeft: 36, flexShrink: 0,
      }}>
        <span style={{ fontSize: 9, color: th.sub, opacity: 0.6 }}>
          전남광주 통합특별시 시민주권 정책공론장
        </span>
      </div>
    </div>
  )
}

/* ── 스케일 래퍼 ── */
function SlidePreview({ slides, activeKey, theme, policyNum, innerRef }: {
  slides: Slides; activeKey: SlideKey; theme: ThemeId; policyNum?: string
  innerRef?: React.Ref<HTMLDivElement>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.55)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setScale(containerRef.current.clientWidth / 640)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ width: '100%', height: 360 * scale, overflow: 'hidden', borderRadius: 10 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }} ref={innerRef}>
          <SlideBody slides={slides} activeKey={activeKey} theme={theme} policyNum={policyNum} />
        </div>
      </div>
    </div>
  )
}

/* ── 테마 썸네일 ── */
function ThemeThumb({ tid, slides, active, onClick }: {
  tid: ThemeId; slides: Slides; active: boolean; onClick: () => void
}) {
  const scale = 80 / 640
  const th = THEMES[tid]
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
    }}>
      <div style={{
        width: 80, height: 45, overflow: 'hidden', borderRadius: 6,
        border: active ? '2px solid #2dd4bf' : '2px solid #e2e8f0',
        boxShadow: active ? '0 0 0 2px #2dd4bf40' : 'none',
      }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
          <SlideBody slides={slides} activeKey="slide1" theme={tid} />
        </div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: active ? '#2dd4bf' : '#94a3b8' }}>
        {th.name}
      </span>
    </button>
  )
}

/* ════════════════════════════════════════════ */
export default function OperatorPage() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const agenda = getAgenda(agendaId || '')
  const { role } = useRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (role !== 'facilitator' && role !== 'recorder' && role !== 'admin') navigate('/')
  }, [role, navigate])

  const [opinions, setOpinions] = useState<any[]>([])
  const [tableIntro, setTableIntro] = useState('')
  const [tiroUrl, setTiroUrl] = useState('')
  const [tiroSummary, setTiroSummary] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [slidesSaved, setSlidesSaved] = useState(false)
  const [activeSlide, setActiveSlide] = useState<SlideKey>('slide1')
  const [theme, setTheme] = useState<ThemeId>(0)
  const [downloading, setDownloading] = useState(false)
  const [slides, setSlides] = useState<Slides>({
    slide1_title: '', slide1_keywords: '',
    slide2: '', slide3: '', slide4: '', slide5: '',
  })
  const fileRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const slideBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: sess }, { data: ops }] = await Promise.all([
      supabase.from('table_sessions').select('*').eq('policy_id', agendaId).single(),
      supabase.from('participant_opinions').select('*').eq('policy_id', agendaId),
    ])
    if (sess) {
      setTiroUrl(sess.tiro_url || '')
      setTiroSummary(sess.tiro_summary || '')
      setTableIntro(sess.table_intro || agenda?.whyImportant || '')
      if (sess.photos) setPhotos(sess.photos)
      if (sess.slides) setSlides(prev => ({ ...prev, ...sess.slides }))
      else if (sess.ai_result) {
        setSlides(prev => ({
          ...prev,
          slide1_title: sess.ai_result.policy_title || agenda?.title || '',
          slide1_keywords: (sess.ai_result.keywords || []).join('\n'),
          slide2: sess.ai_result.background || '',
          slide3: sess.ai_result.discussion || '',
          slide4: sess.ai_result.final_proposal || '',
          slide5: sess.ai_result.expected_effect || '',
        }))
      }
    }
    if (ops) setOpinions(ops)
  }

  /* ── 슬라이드 다운로드 ── */
  const handleDownload = async () => {
    setDownloading(true)
    try {
      const policyNum = agendaId?.replace('policy-', '') || ''
      const { default: pptx } = await import('pptxgenjs')
      const prs = new pptx()
      prs.defineLayout({ name: 'WIDE', width: 10, height: 5.63 })
      prs.layout = 'WIDE'

      const th = THEMES[theme]
      const ALL_KEYS: SlideKey[] = ['slide1', 'slide2', 'slide3', 'slide4', 'slide5']

      for (let i = 0; i < 5; i++) {
        const key = ALL_KEYS[i]
        const cfg = SLIDE_TABS[i]
        const sld = prs.addSlide()

        // 배경
        if (theme === 2) {
          sld.background = { color: '0f172a' }
        } else {
          sld.background = { color: th.bg.replace('#', '') }
        }

        // 테마별 장식
        if (theme === 0 || theme === 2) {
          sld.addShape(prs.ShapeType.ellipse, {
            x: 7.5, y: -0.5, w: 2.8, h: 2.8,
            fill: { color: cfg.accent.replace('#', ''), transparency: 85 }, line: { color: 'transparent' },
          })
        }
        if (theme === 1) {
          sld.addShape(prs.ShapeType.rect, {
            x: 0, y: 0, w: 10, h: 0.12, fill: { color: cfg.accent.replace('#', '') }, line: { color: 'transparent' },
          })
        }

        // 배지 + 라벨
        sld.addShape(prs.ShapeType.roundRect, {
          x: 0.5, y: 0.35, w: 0.55, h: 0.28,
          fill: { color: cfg.accent.replace('#', ''), transparency: theme === 1 ? 0 : 80 },
          line: { color: 'transparent' }, rectRadius: 0.14,
        })
        sld.addText(`${i + 1}장`, {
          x: 0.5, y: 0.35, w: 0.55, h: 0.28,
          fontSize: 8, color: theme === 1 ? 'ffffff' : cfg.accent.replace('#', ''),
          bold: true, align: 'center', valign: 'middle',
        })
        sld.addText(cfg.label, {
          x: 1.15, y: 0.35, w: 6, h: 0.28,
          fontSize: 9, color: th.sub.replace('rgba(255,255,255,0.55)', 'aaaaaa')
            .replace('rgba(255,255,255,0.45)', '888888').replace('#64748b', '64748b'),
        })
        sld.addText(`정책 ${policyNum}`, {
          x: 8.5, y: 0.35, w: 1.3, h: 0.28,
          fontSize: 8, color: 'aaaaaa', align: 'right',
        })

        // Slide 1: 제목 + 키워드
        if (key === 'slide1') {
          sld.addText(slides.slide1_title || '정책 제목', {
            x: 0.5, y: 1.0, w: 9, h: 2.8,
            fontSize: 28, color: th.text.replace('#', '').replace('ffffff', 'ffffff').replace('f1f5f9', 'f1f5f9'),
            bold: true, valign: 'middle', wrap: true,
          })
          const kws = slides.slide1_keywords?.split('\n').filter(Boolean) || []
          kws.forEach((kw, ki) => {
            sld.addShape(prs.ShapeType.roundRect, {
              x: 0.5 + ki * 1.5, y: 4.5, w: 1.3, h: 0.35,
              fill: { color: cfg.accent.replace('#', ''), transparency: 85 },
              line: { color: cfg.accent.replace('#', ''), transparency: 60 }, rectRadius: 0.17,
            })
            sld.addText(kw, {
              x: 0.5 + ki * 1.5, y: 4.5, w: 1.3, h: 0.35,
              fontSize: 9, color: cfg.accent.replace('#', ''), bold: true, align: 'center', valign: 'middle',
            })
          })
        } else {
          // Slide 2~5: 본문
          const bodyKeys: Record<SlideKey, string> = {
            slide1: '', slide2: slides.slide2, slide3: slides.slide3,
            slide4: slides.slide4, slide5: slides.slide5,
          }
          const pts = (bodyKeys[key] || '').split('\n').filter(s => s.trim().length > 1).slice(0, 5)
          pts.forEach((p, pi) => {
            const y = 0.9 + pi * 0.9
            if (theme === 1) {
              sld.addShape(prs.ShapeType.rect, {
                x: 0.5, y, w: 9, h: 0.72,
                fill: { color: pi === 0 ? cfg.accent.replace('#', '') : 'f1f5f9', transparency: pi === 0 ? 88 : 0 },
                line: { color: cfg.accent.replace('#', ''), transparency: pi === 0 ? 60 : 80 },
              })
              sld.addShape(prs.ShapeType.rect, {
                x: 0.5, y, w: 0.04, h: 0.72,
                fill: { color: cfg.accent.replace('#', '') }, line: { color: 'transparent' },
              })
            }
            sld.addText(theme !== 1 ? `▸  ${p}` : p, {
              x: theme === 1 ? 0.65 : 0.5, y: y + 0.06, w: 8.7, h: 0.6,
              fontSize: 12,
              color: theme === 1 ? '1e293b' : th.text.replace('#', '').replace('ffffff', 'e8eaf0').replace('f1f5f9', 'e8eaf0'),
              valign: 'middle',
            })
          })
        }

        // 하단 바
        sld.addShape(prs.ShapeType.rect, {
          x: 0, y: 5.2, w: 10, h: 0.43,
          fill: { color: theme === 1 ? cfg.accent.replace('#', '') : 'ffffff', transparency: theme === 1 ? 90 : 96 },
          line: { color: 'transparent' },
        })
        sld.addText('전남광주 통합특별시 시민주권 정책공론장', {
          x: 0.5, y: 5.22, w: 9, h: 0.35,
          fontSize: 7, color: 'aaaaaa',
        })
      }

      await prs.writeFile({ fileName: `${policyNum}번_발표슬라이드_${THEMES[theme].name}.pptx` })
    } catch (e) {
      alert('다운로드에 실패했습니다.')
    } finally {
      setDownloading(false)
    }
  }

  const compressToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })

  const handlePhotoRemove = async (idx: number) => {
    const newPhotos = photos.filter((_, i) => i !== idx)
    setPhotos(newPhotos)
    await supabase.from('table_sessions').update({ photos: newPhotos }).eq('policy_id', agendaId)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const workerUrl = import.meta.env.VITE_WORKER_URL
      const title = agenda?.title || ''
      const keywords = (agenda?.tags || []).slice(0, 6)

      const slide2Lines: string[] = []
      if (tableIntro && tableIntro !== agenda?.whyImportant) slide2Lines.push(tableIntro)
      else if (agenda?.whyImportant) slide2Lines.push(agenda.whyImportant)
      opinions.filter(o => o.agree_content).slice(0, 3)
        .forEach(o => slide2Lines.push(`"${o.agree_content}"`))
      const slide2 = slide2Lines.join('\n')

      let slide3 = ''
      if (tiroSummary) {
        slide3 = tiroSummary
      } else {
        const parts = [
          ...opinions.filter(o => o.agree_content).slice(0, 2).map(o => `✅ 공감: ${o.agree_content}`),
          ...opinions.filter(o => o.concern).slice(0, 2).map(o => `⚠️ 우려: ${o.concern}`),
          ...opinions.filter(o => o.improvement).slice(0, 2).map(o => `💡 보완: ${o.improvement}`),
        ]
        slide3 = parts.join('\n') || `${title}에 대해 시민들이 다양한 시각으로 심층 토론을 진행했습니다.\n주요 의견과 논의 내용을 아래에 정리해 주세요.`
      }

      const proposals = [
        ...opinions.filter(o => o.improvement).slice(0, 3).map(o => o.improvement),
        ...opinions.filter(o => o.first_action).slice(0, 2).map(o => `[우선 실행] ${o.first_action}`),
      ]
      const slide4 = proposals.join('\n') || [
        `${title} 실현을 위한 제도 정비`, '주민 참여 기구 구성 및 운영',
        '단계별 시범사업 추진', '예산 확보 및 전담 부서 지정',
      ].join('\n')

      const effectLines = [
        agenda?.expectedEffect || '',
        ...opinions.filter(o => o.key_sentence).slice(0, 3).map(o => `"${o.key_sentence}"`),
      ].filter(Boolean)
      const slide5 = effectLines.join('\n')

      const data = { policy_title: title, keywords, background: slide2, discussion: slide3, final_proposal: slide4, expected_effect: slide5 }

      if (workerUrl && photos.length > 0) {
        try {
          const res = await fetch(`${workerUrl}/analyze-photo`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoUrl: photos[0], agendaTitle: agenda?.title,
              agendaSummary: agenda?.summary, tiroSummary: tiroSummary || undefined, opinions: opinions.slice(0, 20) }),
          })
          const json = await res.json()
          if (res.ok) {
            setSlides({ slide1_title: json.policy_title || title,
              slide1_keywords: Array.isArray(json.keywords) ? json.keywords.join('\n') : keywords.join('\n'),
              slide2: json.background || slide2, slide3: json.discussion || slide3,
              slide4: json.final_proposal || slide4, slide5: json.expected_effect || slide5 })
            await supabase.from('table_sessions').upsert({ policy_id: agendaId, ai_result: json })
            setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
            return
          }
        } catch { /* fallback */ }
      }

      setSlides({ slide1_title: title, slide1_keywords: keywords.join('\n'), slide2, slide3, slide4, slide5 })
      await supabase.from('table_sessions').upsert({ policy_id: agendaId, ai_result: data })
      setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      alert('AI 생성에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('table_sessions').upsert({
        policy_id: agendaId, table_intro: tableIntro,
        tiro_url: tiroUrl || null, tiro_summary: tiroSummary || null,
        slides, is_confirmed: true,
      })
      setSlidesSaved(true)
      alert('슬라이드가 저장되었습니다. 대시보드에서 확인하세요.')
    } catch {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updateSlide = (key: keyof Slides, value: string) =>
    setSlides(prev => ({ ...prev, [key]: value }))

  if (!agenda) return <div className="p-8 text-center text-gray-500">정책을 찾을 수 없습니다.</div>

  const policyNum = agendaId?.replace('policy-', '')

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">

      {/* 헤더 */}
      <div>
        <span className="text-teal-600 text-xs font-bold">테이블 퍼실 · 기록자</span>
        <h1 className="text-2xl font-black text-navy-800 leading-tight mt-0.5">
          {policyNum}번. {agenda.title}
        </h1>
        <p className="text-gray-400 text-xs mt-1">참여 의견 {opinions.length}개</p>
      </div>

      {/* 테이블 소개 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-black text-navy-800 text-base mb-1">테이블 소개 — 정책 제안 배경과 필요성</h2>
        <p className="text-gray-400 text-xs mb-3">참가자 '정책 알아보기'에 표시됩니다.</p>
        <textarea value={tableIntro} onChange={e => setTableIntro(e.target.value)}
          placeholder={`이 정책은 ~한 문제에서 출발했습니다.\n현재 ~한 상황으로 주민 불편이 큽니다.`}
          rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400" />
      </div>

      {/* ① 정리판 사진 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-black text-navy-800 text-base mb-1">
          ① 정리판 사진 <span className="text-gray-400 font-normal text-sm">(최대 5장)</span>
        </h2>
        <div className="flex flex-wrap gap-2 mt-3">
          {photos.map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
              <img src={url} alt={`정리판${i + 1}`} className="w-full h-full object-cover" />
              <button onClick={() => handlePhotoRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center">✕</button>
            </div>
          ))}
          {photos.length < 5 && (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-teal-400 bg-teal-50 flex items-center justify-center text-teal-500 text-3xl hover:bg-teal-100 transition-colors">
              {uploading ? '…' : '+'}
            </button>
          )}
        </div>
        <input type="file" accept="image/*" multiple ref={fileRef} className="hidden"
          onChange={async e => {
            const files = Array.from(e.target.files || [])
            if (!files.length) return
            e.target.value = ''
            const toAdd = files.slice(0, 5 - photos.length)
            if (!toAdd.length) { alert('최대 5장까지 업로드할 수 있습니다.'); return }
            setUploading(true)
            try {
              const newDataUrls = await Promise.all(toAdd.map(compressToBase64))
              const newPhotos = [...photos, ...newDataUrls]
              setPhotos(newPhotos)
              await supabase.from('table_sessions').upsert({ policy_id: agendaId, photos: newPhotos })
            } catch { alert('사진 처리에 실패했습니다.') }
            finally { setUploading(false) }
          }} />
      </div>

      {/* ② Tiro 회의록 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-black text-navy-800 text-base mb-3">② Tiro 회의록</h2>
        <input type="url" value={tiroUrl} onChange={e => setTiroUrl(e.target.value)}
          placeholder="Tiro 회의록 링크 (https://...)"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-teal-400" />
        <textarea value={tiroSummary} onChange={e => setTiroSummary(e.target.value)}
          placeholder="Tiro 한 페이지 요약본 붙여넣기 (AI 생성 시 3장에 반영)"
          rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400" />
      </div>

      {/* ③ AI 발표 텍스트 생성 */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
        <h2 className="font-black text-navy-800 text-base mb-1">③ 5장 발표 텍스트 자동 생성</h2>
        <p className="text-gray-500 text-xs mb-1">
          1장 제목·키워드 / 2장 배경·공감 / 3장 논의(Tiro 또는 PMI) / 4장 제안 / 5장 기대효과
        </p>
        <p className="text-teal-600 text-xs font-medium mb-3">
          의견 {opinions.length}개 · Tiro {tiroSummary ? '✅' : '없음'} · 사진 {photos.length}장
        </p>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          {generating ? '생성 중...' : '🤖 AI 발표 텍스트 생성'}
        </button>
      </div>

      {/* ④ 슬라이드 편집 */}
      <div id="slide-editor" ref={editorRef} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

        {/* 상단 헤더 */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
          <h2 className="font-black text-navy-800 text-base">④ 슬라이드 편집</h2>
          <div className="flex gap-2">
            <button onClick={handleDownload} disabled={downloading}
              className="bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors">
              {downloading ? '생성중…' : '⬇️ PPTX 다운로드'}
            </button>
            <button onClick={() => setPresenting(true)}
              className="bg-[#1a2458] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-navy-700 transition-colors">
              🖥️ 발표 모드
            </button>
          </div>
        </div>

        {/* 디자인 테마 선택 */}
        <div className="px-5 pb-4">
          <p className="text-xs font-bold text-gray-500 mb-2">슬라이드 디자인</p>
          <div className="flex gap-4">
            {([0, 1, 2] as ThemeId[]).map(tid => (
              <ThemeThumb key={tid} tid={tid} slides={slides} active={theme === tid} onClick={() => setTheme(tid)} />
            ))}
          </div>
        </div>

        {/* 장 탭 */}
        <div className="flex gap-1 px-5 pb-3 overflow-x-auto">
          {SLIDE_TABS.map(t => (
            <button key={t.key} onClick={() => setActiveSlide(t.key)} style={{
              flexShrink: 0,
              borderBottom: activeSlide === t.key ? `2px solid ${t.accent}` : '2px solid transparent',
              color: activeSlide === t.key ? t.accent : '#94a3b8',
              fontWeight: activeSlide === t.key ? 900 : 600,
            }} className="px-2 pb-2 text-xs transition-colors bg-transparent border-0 cursor-pointer">
              {t.num}장
            </button>
          ))}
        </div>

        {/* 라이브 미리보기 */}
        <div className="px-5 pb-3">
          <div className="rounded-xl overflow-hidden border border-gray-100 shadow">
            <SlidePreview slides={slides} activeKey={activeSlide} theme={theme}
              policyNum={policyNum} innerRef={slideBodyRef} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 text-center">
            {SLIDE_TABS.find(t => t.key === activeSlide)?.label} — 아래 편집 시 즉시 반영
          </p>
        </div>

        {/* 편집 필드 */}
        <div className="px-5 pb-5">
          {activeSlide === 'slide1' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">정책 제목 (대제목)</label>
                <input type="text" value={slides.slide1_title}
                  onChange={e => updateSlide('slide1_title', e.target.value)}
                  placeholder="예: 읍면동장 주민 선출제 도입"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">핵심 키워드 (한 줄 = 한 태그)</label>
                <textarea value={slides.slide1_keywords}
                  onChange={e => updateSlide('slide1_keywords', e.target.value)}
                  placeholder={'주민자치\n직접 선출\n전문성 강화'}
                  rows={5} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                내용 (Enter = 슬라이드 항목 구분 · 최대 5줄 권장)
              </label>
              <textarea value={slides[activeSlide as keyof Slides] as string}
                onChange={e => updateSlide(activeSlide as keyof Slides, e.target.value)}
                placeholder={`${activeSlide.replace('slide', '')}장 내용\n한 줄씩 입력하면 슬라이드 항목으로 표시됩니다`}
                rows={7} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400" />
            </div>
          )}
        </div>
      </div>

      {/* 최종 저장 */}
      <button onClick={handleSave} disabled={saving}
        className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-black py-5 rounded-2xl text-xl transition-colors">
        {saving ? '저장 중...' : slidesSaved ? '✅ 저장 완료 — 다시 저장' : '✅ 최종 저장 (대시보드에 반영)'}
      </button>

      {presenting && (
        <PresentationMode slides={slides} policyNum={policyNum} onClose={() => setPresenting(false)} />
      )}
    </div>
  )
}
