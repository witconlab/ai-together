import { HSlide, HEl, makeId, ACCENT_COLORS, SW, SH } from '../types/htmlSlide'

export interface SlideContent {
  title: string
  keywords: string[]
  tableIntro: string
  agreeOps: string[]
  concerns: string[]
  improves: string[]
  firstActs: string[]
  keySents: string[]
  tiroSummary: string
  expectedEffect: string
}

function el(text: string, opts: Partial<HEl>): HEl {
  return {
    id: makeId(), type: 'text',
    x: 0, y: 0, w: 200, h: 50,
    z: 1, opacity: 1,
    text, fontSize: 16, fontFamily: 'Noto Sans KR',
    bold: false, italic: false, underline: false,
    color: '#ffffff', align: 'left',
    bgColor: 'transparent', lineHeight: 1.5,
    src: '', fit: 'contain',
    ...opts,
  }
}

function box(bgColor: string, x: number, y: number, w: number, h: number, z = 0): HEl {
  return el('', { bgColor, x, y, w, h, z })
}

/* ─── SLIDE 1: 정책명 + 키워드 원형 배지 ─────────────────────────── */
function buildSlide1(c: SlideContent, id: string): HSlide {
  const kws = c.keywords.slice(0, 6)
  const pillW = 138, pillH = 62, pillGap = 10
  const totalW = kws.length * pillW + Math.max(0, kws.length - 1) * pillGap
  const startX = Math.max(28, (SW - totalW) / 2)

  return {
    id, bg: '#1a2458',
    elements: [
      // 왼쪽 강조 바
      box('#2dd4bf', 0, 0, 6, SH, 1),
      // 상단 라벨
      el('정책 제목과 핵심 키워드', { x: 40, y: 22, w: 880, h: 36, fontSize: 12, color: '#2dd4bf', bold: true, z: 2 }),
      // 메인 제목
      el(c.title || '정책명을 입력하세요', {
        x: 60, y: 80, w: 840, h: 270,
        fontSize: 44, color: '#ffffff', bold: true, align: 'center', z: 2, lineHeight: 1.3,
      }),
      // 구분선
      box('#2dd4bf', 40, 370, 880, 2, 2),
      // 키워드 배지
      ...kws.map((kw, i) => el(kw, {
        x: startX + i * (pillW + pillGap), y: 390, w: pillW, h: pillH,
        bgColor: ACCENT_COLORS[i % ACCENT_COLORS.length],
        color: '#0f172a', fontSize: 14, bold: true, align: 'center', z: 3,
      })),
      ...(kws.length === 0 ? [el('키워드를 AI로 생성하세요', { x: 200, y: 395, w: 560, h: 52, color: '#475569', align: 'center', z: 2 })] : []),
    ],
  }
}

/* ─── SLIDE 2: 왜 이 정책이 필요한가 (2컬럼 인포그래픽) ─────────── */
function buildSlide2(c: SlideContent, id: string): HSlide {
  const intro = (c.tableIntro || '이 정책이 필요한 배경을 입력하세요.').slice(0, 250)
  const agrees = c.agreeOps.slice(0, 3)

  const rightCards: HEl[] = agrees.flatMap((agree, i) => [
    box(i % 2 === 0 ? '#0a3b38' : '#0c2e3a', 494, 106 + i * 126, 436, 118, 1),
    el(`✅  ${agree}`.slice(0, 90), {
      x: 506, y: 112 + i * 126, w: 414, h: 108,
      color: '#e2e8f0', fontSize: 14, z: 3, lineHeight: 1.55,
    }),
  ])

  return {
    id, bg: '#0c1428',
    elements: [
      el('왜 이 정책이 필요한가', { x: 30, y: 10, w: 900, h: 32, fontSize: 12, color: '#60a5fa', bold: true, z: 2 }),
      // 왼쪽 패널
      box('#142440', 24, 46, 454, 476, 1),
      box('#1D4ED8', 24, 46, 454, 50, 2),
      el('📋  정책 배경', { x: 36, y: 53, w: 430, h: 36, fontSize: 14, color: '#fff', bold: true, z: 3 }),
      el(intro, { x: 36, y: 106, w: 430, h: 408, fontSize: 15, color: '#cbd5e1', z: 3, lineHeight: 1.7 }),
      // 오른쪽 패널
      box('#0a2a2e', 494, 46, 442, 476, 1),
      box('#0D9488', 494, 46, 442, 50, 2),
      el('💬  공감한 의견', { x: 506, y: 53, w: 420, h: 36, fontSize: 14, color: '#fff', bold: true, z: 3 }),
      ...rightCards.length ? rightCards : [el('의견을 입력하세요', { x: 506, y: 120, w: 420, h: 60, color: '#475569', fontSize: 14, z: 3 })],
    ],
  }
}

/* ─── SLIDE 3: 시민 의견 (카카오톡 대화창 스타일) ────────────────── */
function buildSlide3(c: SlideContent, id: string): HSlide {
  const bubbles: HEl[] = []
  let y = 78

  // tiroSummary가 있으면 줄 단위로, 없으면 opinions 조합
  const lines: { text: string; side: 'L' | 'R' }[] = []

  if (c.tiroSummary) {
    const chunks = c.tiroSummary.split('\n').filter(l => l.trim()).slice(0, 4)
    chunks.forEach((t, i) => lines.push({ text: t, side: i % 2 === 0 ? 'L' : 'R' }))
  } else {
    const all = [
      ...c.concerns.map(t => ({ text: `⚠️ ${t}`, side: 'L' as const })),
      ...c.agreeOps.map(t => ({ text: `✅ ${t}`, side: 'R' as const })),
      ...c.improves.map(t => ({ text: `💡 ${t}`, side: 'L' as const })),
    ]
    all.slice(0, 4).forEach(item => lines.push(item))
  }

  if (!lines.length) {
    lines.push({ text: '참여자 의견이 여기에 표시됩니다', side: 'L' })
    lines.push({ text: '공감·우려·개선 의견이 대화 형식으로 정리됩니다', side: 'R' })
  }

  lines.slice(0, 4).forEach(({ text, side }) => {
    const isR = side === 'R'
    const maxW = 390
    const h = text.length > 60 ? 96 : 76
    bubbles.push(
      box(isR ? '#FDDC3F' : '#ffffff', isR ? SW - 50 - maxW : 50, y, maxW, h, 3),
      el(text.slice(0, 100), {
        x: (isR ? SW - 50 - maxW : 50) + 10, y: y + 8,
        w: maxW - 20, h: h - 16,
        color: '#1e293b', fontSize: 14, z: 4, lineHeight: 1.5,
        align: isR ? 'right' : 'left',
      }),
    )
    y += h + 14
  })

  return {
    id, bg: '#B5C5CC',
    elements: [
      // 상단 헤더 바
      box('#3c3c3c', 0, 0, SW, 56, 1),
      el('📋  테이블 토론 내용', { x: 20, y: 10, w: 700, h: 36, fontSize: 16, color: '#fff', bold: true, z: 2 }),
      el('시민들이 나눈 이야기', { x: 20, y: 38, w: 600, h: 18, fontSize: 10, color: 'rgba(255,255,255,0.5)', z: 2 }),
      // 왼쪽 이름표
      el('🗣 참여자A', { x: 50, y: 58, w: 120, h: 18, fontSize: 10, color: '#4a5568', bold: true, z: 3 }),
      // 오른쪽 이름표
      el('🗣 참여자B', { x: SW - 170, y: 58, w: 120, h: 18, fontSize: 10, color: '#4a5568', bold: true, align: 'right', z: 3 }),
      ...bubbles,
    ],
  }
}

/* ─── SLIDE 4: 최종 정책 제안 (표 형식) ─────────────────────────── */
function buildSlide4(c: SlideContent, id: string): HSlide {
  const rows = [
    ...c.improves,
    ...c.firstActs.map(a => `[우선실행] ${a}`),
  ].slice(0, 5)
  if (!rows.length) rows.push('정책 제안을 입력하세요', '우선 실행 과제를 입력하세요')

  const rowH = 76, rowGap = 5, startY = 108

  const rowEls: HEl[] = rows.flatMap((p, i) => [
    box(i % 2 === 0 ? '#1E3A5F' : '#243448', 26, startY + i * (rowH + rowGap), 908, rowH, 1),
    el(`${i + 1}`, {
      x: 34, y: startY + i * (rowH + rowGap) + 8, w: 50, h: 60,
      bgColor: ACCENT_COLORS[i % ACCENT_COLORS.length],
      color: '#0f172a', fontSize: 20, bold: true, align: 'center', z: 3,
    }),
    el(p.slice(0, 100), {
      x: 96, y: startY + i * (rowH + rowGap) + 8, w: 826, h: 62,
      color: '#e2e8f0', fontSize: 15, z: 3, lineHeight: 1.5,
    }),
  ])

  return {
    id, bg: '#1e293b',
    elements: [
      el('최종 정책 제안', { x: 30, y: 10, w: 900, h: 32, fontSize: 12, color: '#34d399', bold: true, z: 2 }),
      box('#0D4F49', 26, 46, 908, 54, 2),
      el('📌  제안 내용', { x: 38, y: 55, w: 500, h: 36, fontSize: 15, color: '#fff', bold: true, z: 3 }),
      el('우선순위', { x: 790, y: 58, w: 130, h: 30, fontSize: 12, color: 'rgba(255,255,255,0.5)', align: 'right', z: 3 }),
      ...rowEls,
    ],
  }
}

/* ─── SLIDE 5: 기대 효과 (3단 카드 인포그래픽) ───────────────────── */
function buildSlide5(c: SlideContent, id: string): HSlide {
  const effects = c.keySents.length
    ? c.keySents.slice(0, 3)
    : [c.expectedEffect || '기대 효과를 입력하세요', '', '']

  const cardW = 280, cardH = 420, gap = 30
  const startX = Math.round((SW - 3 * cardW - 2 * gap) / 2)
  const cardBgs = ['#1A3A5C', '#0D4040', '#3D1A5C']
  const cardLabels = ['기대효과', '주요성과', '우선실행']

  const cards: HEl[] = effects.slice(0, 3).flatMap((eff, i) => {
    const cx = startX + i * (cardW + gap)
    return [
      box(cardBgs[i], cx, 54, cardW, cardH, 1),
      box(ACCENT_COLORS[i], cx, 54, cardW, 64, 2),
      el(`0${i + 1}`, { x: cx + 8, y: 62, w: 52, h: 48, fontSize: 26, color: '#0f172a', bold: true, align: 'center', z: 3 }),
      el(cardLabels[i], { x: cx + 66, y: 68, w: cardW - 76, h: 40, fontSize: 15, color: '#0f172a', bold: true, z: 3 }),
      el((eff || '-').slice(0, 200), {
        x: cx + 12, y: 128, w: cardW - 24, h: cardH - 86,
        fontSize: 14, color: '#e2e8f0', z: 3, lineHeight: 1.65,
      }),
    ]
  })

  return {
    id, bg: '#0f172a',
    elements: [
      el('기대 효과와 우선 과제', { x: 30, y: 10, w: 900, h: 32, fontSize: 12, color: '#c084fc', bold: true, z: 2 }),
      ...cards,
    ],
  }
}

/* ─── 외부 노출 함수 ──────────────────────────────────────────────── */
export function buildHtmlSlides(c: SlideContent, existingSlides?: HSlide[]): HSlide[] {
  const getId = (i: number) => existingSlides?.[i]?.id || makeId()
  return [
    buildSlide1(c, getId(0)),
    buildSlide2(c, getId(1)),
    buildSlide3(c, getId(2)),
    buildSlide4(c, getId(3)),
    buildSlide5(c, getId(4)),
  ]
}
