import { useState } from 'react'

// eslint-disable-next-line react-refresh/only-export-components
export type SlideData = {
  slide1_title: string
  slide1_keywords: string
  slide2: string
  slide3: string
  slide4: string
  slide5: string
}

export const EMPTY_SLIDES: SlideData = {
  slide1_title: '', slide1_keywords: '',
  slide2: '', slide3: '', slide4: '', slide5: '',
}

type Cfg = { label: string; accent: string; accentBg: string; icon: string }
const CFG: Cfg[] = [
  { label: '정책 제목과 핵심 키워드',         accent: '#2dd4bf', accentBg: 'rgba(45,212,191,0.18)',  icon: '🏛️' },
  { label: '왜 이 정책이 필요한가',            accent: '#60a5fa', accentBg: 'rgba(96,165,250,0.18)',  icon: '🎯' },
  { label: '시민들이 테이블에서 나눈 이야기',   accent: '#fbbf24', accentBg: 'rgba(251,191,36,0.18)',  icon: '💬' },
  { label: '최종 정책 제안',                   accent: '#34d399', accentBg: 'rgba(52,211,153,0.18)',  icon: '📋' },
  { label: '기대 효과와 우선 과제',             accent: '#c084fc', accentBg: 'rgba(192,132,252,0.18)', icon: '✨' },
]

/** Split body text into 2-4 card items */
function splitToCards(text: string, max = 3): string[] {
  if (!text) return []
  const parts = text.split(/\n|(?<=[.!?。])\s+/).filter(s => s.trim().length > 2)
  return parts.slice(0, max)
}

/* ── Template 0: Clean text (default) ── */
function TplText({ cfg, body }: { cfg: Cfg; body: string }) {
  return (
    <>
      <div style={{ color: cfg.accent, fontSize: 20, fontWeight: 900, marginBottom: 14,
        borderLeft: `4px solid ${cfg.accent}`, paddingLeft: 12 }}>
        {cfg.label}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.9,
        flex: 1, whiteSpace: 'pre-wrap', overflow: 'hidden' }}>
        {body || '내용을 입력하세요'}
      </div>
    </>
  )
}

/* ── Template 1: Info Cards ── */
function TplCards({ cfg, body }: { cfg: Cfg; body: string }) {
  const cards = splitToCards(body, 3)
  const cardIcons = ['🔍', '💡', '🚀', '⚡']
  return (
    <>
      <div style={{ color: cfg.accent, fontSize: 16, fontWeight: 900, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{cfg.icon}</span>
        {cfg.label}
      </div>
      <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'stretch' }}>
        {cards.length > 0 ? cards.map((c, i) => (
          <div key={i} style={{
            flex: 1, background: cfg.accentBg,
            border: `1px solid ${cfg.accent}40`,
            borderRadius: 10, padding: '12px 10px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <span style={{ fontSize: 18 }}>{cardIcons[i]}</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, lineHeight: 1.6 }}>{c}</span>
          </div>
        )) : (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: 'auto' }}>내용을 입력하세요</div>
        )}
      </div>
    </>
  )
}

/* ── Template 2: Split (icon sidebar + content) ── */
function TplSplit({ cfg, body, idx }: { cfg: Cfg; body: string; idx: number }) {
  const points = splitToCards(body, 4)
  const icons = ['📌','🔹','▶','◆']
  return (
    <div style={{ display: 'flex', flex: 1, gap: 0, overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div style={{
        width: 120, background: cfg.accentBg,
        borderRight: `2px solid ${cfg.accent}30`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 10, padding: '0 10px', flexShrink: 0,
      }}>
        <div style={{ fontSize: 36 }}>{cfg.icon}</div>
        <div style={{ color: cfg.accent, fontSize: 28, fontWeight: 900 }}>{idx + 1}</div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'center', lineHeight: 1.4 }}>
          {cfg.label}
        </div>
      </div>
      {/* Right content */}
      <div style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', gap: 10 }}>
        {points.length > 0 ? points.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ color: cfg.accent, fontSize: 12, marginTop: 1, flexShrink: 0 }}>{icons[i]}</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 1.6 }}>{p}</span>
          </div>
        )) : (
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>내용을 입력하세요</span>
        )}
      </div>
    </div>
  )
}

/** Choose template type: 0,1,2 based on slide+policy seed */
function getTemplateType(slideIndex: number, policyNum = '0') {
  const seed = parseInt(policyNum, 10) || 0
  return (slideIndex + seed) % 3
}

/** Core slide at exactly 640×360 */
function SlideBody({ slides, index, policyNum }: { slides: SlideData; index: number; policyNum?: string }) {
  const cfg = CFG[index]
  const keywords = slides.slide1_keywords?.split('\n').filter(Boolean) ?? []
  const bodyKey = (['slide2','slide3','slide4','slide5'] as const)[index - 1]
  const body = index > 0 ? (slides[bodyKey] ?? '') : ''
  const tpl = index === 0 ? -1 : getTemplateType(index, policyNum)

  return (
    <div style={{
      width: 640, height: 360,
      background: '#1a2458',
      display: 'flex', flexDirection: 'column',
      padding: tpl === 2 ? '28px 0 28px 28px' : '28px 36px',
      boxSizing: 'border-box',
      position: 'relative', overflow: 'hidden',
      fontFamily: 'inherit',
    }}>
      {/* bg blob */}
      <div style={{
        position: 'absolute', top: -50, right: -50,
        width: 180, height: 180, borderRadius: '50%',
        background: cfg.accentBg, pointerEvents: 'none',
      }} />

      {/* Badge row (not for split template which handles its own layout) */}
      {tpl !== 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexShrink: 0 }}>
          <span style={{
            background: cfg.accent, color: '#1a2458',
            fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20,
          }}>{index + 1}장</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{cfg.label}</span>
          {policyNum && (
            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>정책 {policyNum}</span>
          )}
        </div>
      )}

      {/* Slide 1: Title + keywords */}
      {index === 0 && (
        <>
          <div style={{
            color: 'white', fontSize: 28, fontWeight: 900,
            lineHeight: 1.3, flex: 1, display: 'flex', alignItems: 'center',
          }}>
            {slides.slide1_title || '정책 제목을 입력하세요'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flexShrink: 0 }}>
            {keywords.length > 0
              ? keywords.map((kw, i) => (
                  <span key={i} style={{
                    background: cfg.accentBg, color: cfg.accent,
                    border: `1px solid ${cfg.accent}`,
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 700,
                  }}>{kw}</span>
                ))
              : <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>키워드를 입력하세요</span>
            }
          </div>
        </>
      )}

      {/* Template 0: Clean text */}
      {index > 0 && tpl === 0 && <TplText cfg={cfg} body={body} />}
      {/* Template 1: Info cards */}
      {index > 0 && tpl === 1 && <TplCards cfg={cfg} body={body} />}
      {/* Template 2: Split */}
      {index > 0 && tpl === 2 && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', margin: '-28px -0px -28px -28px' }}>
          <div style={{ paddingTop: 28, paddingLeft: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <span style={{
                background: cfg.accent, color: '#1a2458',
                fontSize: 10, fontWeight: 900, padding: '3px 10px', borderRadius: 20,
              }}>{index + 1}장</span>
              {policyNum && (
                <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)', fontSize: 9, paddingRight: 36 }}>정책 {policyNum}</span>
              )}
            </div>
            <TplSplit cfg={cfg} body={body} idx={index} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Thumbnail 160×90 */
export function SlideThumbnail({
  slides, index, policyNum, isActive, onClick,
}: {
  slides: SlideData; index: number; policyNum?: string
  isActive?: boolean; onClick?: () => void
}) {
  const scale = 160 / 640
  return (
    <button onClick={onClick} style={{
      width: 160, height: 90, overflow: 'hidden', borderRadius: 8, flexShrink: 0,
      border: isActive ? '2px solid #2dd4bf' : '2px solid rgba(255,255,255,0.1)',
      cursor: 'pointer', padding: 0, background: 'transparent', position: 'relative',
    }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        <SlideBody slides={slides} index={index} policyNum={policyNum} />
      </div>
    </button>
  )
}

/** Mini thumbnail for dashboard grid (120×67) */
export function SlideGridThumb({
  slides, policyNum, onClick,
}: {
  slides: SlideData; policyNum?: string; onClick?: () => void
}) {
  const scale = 120 / 640
  return (
    <button onClick={onClick} style={{
      width: 120, height: 67, overflow: 'hidden', borderRadius: 6, flexShrink: 0,
      border: '1px solid rgba(0,0,0,0.1)',
      cursor: onClick ? 'pointer' : 'default', padding: 0, background: 'transparent',
    }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        <SlideBody slides={slides} index={0} policyNum={policyNum} />
      </div>
    </button>
  )
}

/** Fullscreen presentation overlay */
export function PresentationMode({
  slides, policyNum, onClose,
}: {
  slides: SlideData; policyNum?: string; onClose: () => void
}) {
  const [cur, setCur] = useState(0)
  const vw = typeof window !== 'undefined' ? window.innerWidth : 640
  const vh = typeof window !== 'undefined' ? window.innerHeight - 100 : 360
  const scale = Math.min(vw / 640, vh / 360)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)',
      zIndex: 200, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* top bar */}
      <div style={{
        position: 'absolute', top: 16, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2,3,4].map(i => (
            <button key={i} onClick={() => setCur(i)} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i === cur ? '#2dd4bf' : 'rgba(255,255,255,0.3)',
              border: 'none', cursor: 'pointer', padding: 0,
            }} />
          ))}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{cur + 1} / 5</span>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
          width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}>
        <SlideBody slides={slides} index={cur} policyNum={policyNum} />
      </div>

      <div style={{ position: 'absolute', bottom: 20, display: 'flex', gap: 12 }}>
        <button onClick={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0} style={{
          background: cur === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
          border: 'none', color: cur === 0 ? 'rgba(255,255,255,0.3)' : 'white',
          padding: '10px 28px', borderRadius: 24, cursor: cur === 0 ? 'not-allowed' : 'pointer',
          fontSize: 15, fontWeight: 700,
        }}>← 이전</button>
        <button onClick={() => setCur(c => Math.min(4, c + 1))} disabled={cur === 4} style={{
          background: cur === 4 ? 'rgba(255,255,255,0.08)' : '#2dd4bf',
          border: 'none', color: cur === 4 ? 'rgba(255,255,255,0.3)' : '#1a2458',
          padding: '10px 28px', borderRadius: 24, cursor: cur === 4 ? 'not-allowed' : 'pointer',
          fontSize: 15, fontWeight: 900,
        }}>다음 →</button>
      </div>
    </div>
  )
}
