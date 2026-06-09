import { useState } from 'react'
import { agendas } from '../data/agendas'
import { api } from '../utils/api'
import type { SlideDeckPlan, SlideImagePlan } from '../types'

const slideCounts = [6, 7, 8]
const styles = ['공공기관 발표자료', '실사 기반 발표 슬라이드', '따뜻한 지역 공동체 슬라이드']

function SlideCard({ slide, index }: { slide: SlideImagePlan; index: number }) {
  const [copied, setCopied] = useState(false)

  function copyPrompt() {
    navigator.clipboard.writeText(slide.imagePrompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  return (
    <div className="card overflow-hidden p-0">
      {/* 슬라이드 미리보기 (16:9 placeholder) */}
      <div
        className="w-full bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center text-center p-6"
        style={{ aspectRatio: '16/9' }}
      >
        <span className="text-white/40 text-sm mb-2">슬라이드 {slide.slideNumber}</span>
        <h3 className="text-white text-xl font-bold mb-2 leading-tight">{slide.title}</h3>
        <p className="text-teal-300 text-sm leading-relaxed max-w-xs">{slide.keyMessage}</p>
      </div>
      <div className="p-4">
        <div className="text-xs text-gray-500 mb-2 space-y-1">
          <p><strong>장면:</strong> {slide.visualScene}</p>
          <p><strong>구성:</strong> {slide.layoutGuide}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-xs text-gray-400 font-medium mb-1">이미지 프롬프트</p>
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{slide.imagePrompt}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyPrompt}
            className="flex-1 text-sm py-2 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50 min-h-0 font-medium"
          >
            {copied ? '✓ 복사됨' : '프롬프트 복사'}
          </button>
          {slide.imageUrl ? (
            <a
              href={slide.imageUrl}
              download={`slide-${slide.slideNumber}.png`}
              className="flex-1 text-sm py-2 rounded-lg bg-teal-500 text-white text-center font-medium hover:bg-teal-600"
            >
              다운로드
            </a>
          ) : (
            <button
              disabled
              className="flex-1 text-sm py-2 rounded-lg bg-gray-100 text-gray-400 min-h-0 font-medium cursor-not-allowed"
            >
              이미지 미생성
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SlideDeck() {
  const [agendaId, setAgendaId] = useState('')
  const [proposalText, setProposalText] = useState('')
  const [presentationText, setPresentationText] = useState('')
  const [slideCount, setSlideCount] = useState(7)
  const [style, setStyle] = useState('공공기관 발표자료')
  const [deck, setDeck] = useState<SlideDeckPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  async function generate() {
    if (!agendaId || !proposalText.trim()) return
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    setLoading(true)
    setError('')
    setDeck(null)
    setConfirmed(false)
    try {
      const res = await api.generateSlideDeck({
        agendaId,
        proposalText,
        presentationText,
        slideCount,
        aspectRatio: '16:9',
        style,
      })
      setDeck(res as SlideDeckPlan)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function downloadJSON() {
    if (!deck) return
    const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deck.deckTitle}-slides.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadMarkdown() {
    if (!deck) return
    const md = deck.slides
      .map(
        (s) =>
          `## 슬라이드 ${s.slideNumber}: ${s.title}\n\n**핵심 메시지:** ${s.keyMessage}\n\n**장면:** ${s.visualScene}\n\n**구성:** ${s.layoutGuide}\n\n**이미지 프롬프트:**\n${s.imagePrompt}\n`
      )
      .join('\n---\n\n')
    const blob = new Blob([`# ${deck.deckTitle}\n\n${md}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deck.deckTitle}-slides.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="section-title">발표용 슬라이드 이미지 만들기</h1>
      <p className="text-gray-500 mb-2 leading-relaxed">
        정책 제안안을 붙여넣으면 16:9 발표용 슬라이드 장표를 생성합니다.
      </p>
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-6">
        <p className="text-amber-700 text-sm">⚠️ 슬라이드 생성은 AI 비용이 발생합니다. 운영진만 사용해 주세요.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label className="font-bold text-navy-700 block mb-2">의제 선택</label>
          <select
            value={agendaId}
            onChange={(e) => setAgendaId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-navy-400"
          >
            <option value="">의제를 선택하세요</option>
            {agendas.map((a) => (
              <option key={a.agendaId} value={a.agendaId}>{a.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-bold text-navy-700 block mb-2">정책 제안안</label>
          <textarea
            value={proposalText}
            onChange={(e) => setProposalText(e.target.value)}
            placeholder="정책 제안안을 붙여넣으세요."
            rows={5}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-navy-400 resize-none"
          />
        </div>

        <div>
          <label className="font-bold text-navy-700 block mb-1">
            발표문 <span className="text-gray-400 font-normal text-sm">(선택)</span>
          </label>
          <textarea
            value={presentationText}
            onChange={(e) => setPresentationText(e.target.value)}
            placeholder="발표문을 붙여넣으면 슬라이드 구성에 반영됩니다."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-navy-400 resize-none"
          />
        </div>

        <div>
          <label className="font-bold text-navy-700 block mb-2">슬라이드 수</label>
          <div className="flex gap-2">
            {slideCounts.map((c) => (
              <button
                key={c}
                onClick={() => setSlideCount(c)}
                className={`flex-1 py-3 rounded-xl font-bold min-h-0 ${
                  slideCount === c ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c}장
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-bold text-navy-700 block mb-2">디자인 스타일</label>
          <div className="flex flex-col gap-2">
            {styles.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`py-3 px-4 rounded-xl text-left font-medium min-h-0 ${
                  style === s
                    ? 'bg-navy-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {confirmed ? (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
            <p className="text-amber-800 font-bold mb-1">정말 생성할까요?</p>
            <p className="text-amber-700 text-sm mb-3">AI API 비용이 발생합니다.</p>
            <div className="flex gap-2">
              <button onClick={generate} className="flex-1 btn-primary">
                {loading ? '생성 중…' : '네, 생성합니다'}
              </button>
              <button
                onClick={() => setConfirmed(false)}
                className="flex-1 btn-secondary"
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={loading || !agendaId || !proposalText.trim()}
            className="btn-teal disabled:opacity-50 text-xl py-4"
          >
            {loading ? '생성 중…' : '🖼️ 슬라이드 장표 생성'}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      {deck && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-black text-navy-800 text-xl">{deck.deckTitle}</h2>
              <p className="text-gray-500 text-sm">{deck.slideCount}장 · {deck.aspectRatio} · {deck.style}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadJSON} className="text-sm border border-navy-200 text-navy-600 hover:bg-navy-50 px-3 py-2 rounded-lg min-h-0">
                JSON
              </button>
              <button onClick={downloadMarkdown} className="text-sm border border-navy-200 text-navy-600 hover:bg-navy-50 px-3 py-2 rounded-lg min-h-0">
                MD
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {deck.slides.map((slide, i) => (
              <SlideCard key={i} slide={slide} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
