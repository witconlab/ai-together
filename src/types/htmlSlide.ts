export const SW = 960   // slide logical width
export const SH = 540   // slide logical height

export type Align = 'left' | 'center' | 'right'

export interface HEl {
  id: string
  type: 'text' | 'image'
  x: number; y: number; w: number; h: number
  z: number
  opacity: number
  // text
  text: string
  fontSize: number
  fontFamily: string
  bold: boolean
  italic: boolean
  underline: boolean
  color: string
  align: Align
  bgColor: string
  lineHeight: number
  // image
  src: string
  fit: 'contain' | 'cover' | 'fill'
}

export interface HSlide {
  id: string
  bg: string
  elements: HEl[]
}

export function makeId() { return Math.random().toString(36).slice(2, 9) }

export function defaultTextEl(text = '텍스트', opts: Partial<HEl> = {}): HEl {
  return {
    id: makeId(), type: 'text',
    x: 80, y: 80, w: 500, h: 80,
    z: 1, opacity: 1,
    text, fontSize: 32, fontFamily: 'Noto Sans KR',
    bold: false, italic: false, underline: false,
    color: '#ffffff', align: 'left',
    bgColor: 'transparent', lineHeight: 1.5,
    src: '', fit: 'contain',
    ...opts,
  }
}

export function defaultImageEl(src = '', opts: Partial<HEl> = {}): HEl {
  return {
    id: makeId(), type: 'image',
    x: 120, y: 80, w: 400, h: 280,
    z: 1, opacity: 1,
    text: '', fontSize: 16, fontFamily: 'Noto Sans KR',
    bold: false, italic: false, underline: false,
    color: '#ffffff', align: 'left',
    bgColor: 'transparent', lineHeight: 1.5,
    src, fit: 'contain',
    ...opts,
  }
}

export const ACCENT_COLORS = ['#2dd4bf', '#60a5fa', '#fbbf24', '#34d399', '#c084fc']

export function defaultSlide(idx: number): HSlide {
  const LABELS = [
    '정책 제목과 핵심 키워드',
    '왜 이 정책이 필요한가',
    '시민들이 테이블에서 나눈 이야기',
    '최종 정책 제안',
    '기대 효과와 우선 과제',
  ]
  const accent = ACCENT_COLORS[idx]
  return {
    id: makeId(),
    bg: '#1a2458',
    elements: [
      defaultTextEl(LABELS[idx], {
        x: 40, y: 20, w: 880, h: 56,
        fontSize: 14, color: accent, bold: true, z: 2,
      }),
      defaultTextEl('내용을 입력하거나 AI 생성을 사용하세요', {
        x: 40, y: 90, w: 880, h: 360,
        fontSize: 22, color: '#ffffff', z: 1, lineHeight: 1.7,
      }),
    ],
  }
}
