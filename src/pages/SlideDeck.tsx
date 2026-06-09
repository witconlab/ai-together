import { useState } from 'react'
import { agendas } from '../data/agendas'
import { api } from '../utils/api'
import type { GenerateSlideImageResponse } from '../utils/api'
import type { SlideDeckPlan, SlideImagePlan } from '../types'

const slideCounts = [5, 6, 7, 8]
const styles = ['공공기관 발표자료', '따뜻한 지역 공동체 슬라이드', '실사 기반 발표 슬라이드']

// 슬라이드 카드 (이미지 생성 전/후)
function SlideCard({
  slide,
  image,
  onCopyPrompt,
}: {
  slide: SlideImagePlan
  image?: GenerateSlideImageResponse
  onCopyPrompt: (prompt: string) => void
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    onCopyPrompt(slide.imagePrompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="card overflow-hidden p-0 border-2 border-gray-100">
      {/* 슬라이드 미리보기 */}
      <div
        className="w-full relative flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ aspectRatio: '16/9' }}
      >
        {image ? (
          <img
            src={image.imageBase64}
            alt={`슬라이드 ${slide.slideNumber}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-navy-800 to-navy-900 flex flex-col items-center justify-center p-6">
            <span className="text-white/40 text-sm mb-2">슬라이드 {slide.slideNumber}</span>
            <h3 className="text-white text-xl font-bold mb-2 leading-tight">{slide.title}</h3>
            <p className="text-teal-300 text-sm leading-relaxed max-w-xs">{slide.keyMessage}</p>
          </div>
        )}
        {/* 슬라이드 번호 뱃지 */}
        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {slide.slideNumber}
        </div>
        {image && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-3 py-2">
            <p className="text-white text-sm font-bold truncate">{slide.title}</p>
            <p className="text-white/70 text-xs truncate">{slide.keyMessage}</p>
          </div>
        )}
      </div>

      {/* 텍스트 정보 */}
      {!image && (
        <div className="p-4">
          <div className="text-xs text-gray-500 mb-2 space-y-1">
            <p><strong>장면:</strong> {slide.visualScene}</p>
            <p><strong>구성:</strong> {slide.layoutGuide}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-xs text-gray-400 font-medium mb-1">DALL-E 이미지 프롬프트</p>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{slide.imagePrompt}</p>
          </div>
          <button
            onClick={copy}
            className="w-full text-sm py-2 rounded-lg border border-navy-200 text-navy-600 hover:bg-navy-50 min-h-0 font-medium"
          >
            {copied ? '✓ 복사됨' : '프롬프트 복사'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function SlideDeck() {
  // ── 슬라이드 구성안 (Gemini) ─────────────────────────────────────
  const [agendaId, setAgendaId] = useState('')
  const [proposalText, setProposalText] = useState('')
  const [presentationText, setPresentationText] = useState('')
  const [slideCount, setSlideCount] = useState(5)
  const [style, setStyle] = useState('공공기관 발표자료')
  const [deck, setDeck] = useState<SlideDeckPlan | null>(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [confirmPlan, setConfirmPlan] = useState(false)

  // ── DALL-E 이미지 생성 ───────────────────────────────────────────
  const [images, setImages] = useState<GenerateSlideImageResponse[]>([])
  const [imgLoading, setImgLoading] = useState(false)
  const [imgProgress, setImgProgress] = useState(0)
  const [imgError, setImgError] = useState('')
  const [confirmImg, setConfirmImg] = useState(false)

  // ── PPT 다운로드 ─────────────────────────────────────────────────
  const [pptLoading, setPptLoading] = useState(false)

  // ── 슬라이드 구성안 생성 (Gemini) ───────────────────────────────
  async function generatePlan() {
    if (!agendaId || !proposalText.trim()) return
    if (!confirmPlan) { setConfirmPlan(true); return }
    setPlanLoading(true)
    setPlanError('')
    setDeck(null)
    setImages([])
    setConfirmPlan(false)
    try {
      const res = await api.generateSlideDeck({
        agendaId, proposalText, presentationText,
        slideCount, aspectRatio: '16:9', style,
      })
      setDeck(res as SlideDeckPlan)
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setPlanLoading(false)
    }
  }

  // ── DALL-E 이미지 생성 ───────────────────────────────────────────
  async function generateImages() {
    if (!deck) return
    setImgLoading(true)
    setImgError('')
    setImages([])
    setImgProgress(0)
    setConfirmImg(false)

    const generated: GenerateSlideImageResponse[] = []
    try {
      for (let i = 0; i < deck.slides.length; i++) {
        const slide = deck.slides[i]
        setImgProgress(i + 1)
        const result = await api.generateSlideImage({
          slideNumber: slide.slideNumber,
          title: slide.title,
          imagePrompt: slide.imagePrompt,
          style: deck.style,
        })
        generated.push(result)
        setImages([...generated]) // 이미지마다 즉시 표시
      }
    } catch (e) {
      setImgError(e instanceof Error ? e.message : '이미지 생성 오류')
    } finally {
      setImgLoading(false)
      setImgProgress(0)
    }
  }

  // ── PPT 다운로드 (pptxgenjs) ─────────────────────────────────────
  async function downloadPPT() {
    if (!deck || images.length === 0) return
    setPptLoading(true)
    try {
      const { default: PptxGenJS } = await import('pptxgenjs')
      const pptx = new PptxGenJS()
      pptx.layout = 'LAYOUT_WIDE' // 16:9 (13.33" x 7.5")

      for (const img of images) {
        const slideInfo = deck.slides.find((s) => s.slideNumber === img.slideNumber)
        const slide = pptx.addSlide()

        // 배경 이미지 (전체 슬라이드)
        slide.addImage({ data: img.imageBase64, x: 0, y: 0, w: 13.33, h: 7.5 })

        // 하단 반투명 오버레이 (텍스트 가독성)
        slide.addText('', {
          x: 0, y: 5.6, w: 13.33, h: 1.9,
          fill: { color: '000000', transparency: 30 },
          line: { color: '000000', transparency: 100 },
        })

        // 슬라이드 제목
        slide.addText(img.title, {
          x: 0.4, y: 5.7, w: 12.5, h: 0.9,
          fontSize: 28, bold: true, color: 'FFFFFF',
          shadow: { type: 'outer', blur: 4, offset: 2, angle: 315, color: '000000', opacity: 0.9 },
        })

        // 핵심 메시지
        if (slideInfo?.keyMessage) {
          slide.addText(slideInfo.keyMessage, {
            x: 0.4, y: 6.5, w: 12.0, h: 0.7,
            fontSize: 15, color: 'DDDDDD',
            shadow: { type: 'outer', blur: 3, offset: 1, angle: 315, color: '000000', opacity: 0.8 },
          })
        }

        // 슬라이드 번호
        slide.addText(`${img.slideNumber} / ${deck.slides.length}`, {
          x: 12.4, y: 7.1, w: 0.7, h: 0.3,
          fontSize: 10, color: 'AAAAAA', align: 'right',
        })
      }

      await pptx.writeFile({ fileName: `${deck.deckTitle}-슬라이드.pptx` })
    } catch (e) {
      console.error('PPT 생성 오류:', e)
      alert('PPT 파일 생성 중 오류가 발생했습니다.')
    } finally {
      setPptLoading(false)
    }
  }

  // ── 복사 유틸 ────────────────────────────────────────────────────
  function copyAllMarkdown() {
    if (!deck) return
    const md = deck.slides
      .map(
        (s) =>
          `## 슬라이드 ${s.slideNumber}: ${s.title}\n\n` +
          `**핵심 메시지:** ${s.keyMessage}\n\n` +
          `**장면:** ${s.visualScene}\n\n` +
          `**구성:** ${s.layoutGuide}\n\n` +
          `**DALL-E 프롬프트:**\n${s.imagePrompt}\n`
      )
      .join('\n---\n\n')
    navigator.clipboard.writeText(`# ${deck.deckTitle}\n\n${md}`).catch(() => {})
  }

  const allImagesReady = deck && images.length === deck.slides.length
  const costPerImage = 0.04 // DALL-E 3 standard, USD
  const totalCost = deck ? (deck.slides.length * costPerImage).toFixed(2) : '0.00'

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="section-title">발표용 슬라이드 이미지 만들기</h1>
      <p className="text-gray-500 mb-2 leading-relaxed">
        정책 제안안을 입력하면 <strong>Gemini</strong>가 슬라이드 구성안을 만들고,
        <strong> DALL-E 3</strong>가 슬라이드 배경 이미지를 생성합니다.
      </p>
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mb-6">
        <p className="text-amber-700 text-sm">⚠️ 이미지 생성 시 OpenAI API 비용이 발생합니다. 운영진만 사용해 주세요.</p>
      </div>

      {/* ── STEP 1: 슬라이드 구성안 입력 ─────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="font-bold text-navy-700 block mb-2">정책제안 선택</label>
          <select
            value={agendaId}
            onChange={(e) => setAgendaId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-navy-400"
          >
            <option value="">정책제안을 선택하세요</option>
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
            placeholder="최종 정책 제안안을 붙여넣으세요."
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
                  style === s ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 구성안 생성 버튼 */}
        {confirmPlan ? (
          <div className="bg-navy-50 border-2 border-navy-200 rounded-2xl p-4">
            <p className="text-navy-800 font-bold mb-1">슬라이드 구성안을 생성할까요?</p>
            <p className="text-navy-600 text-sm mb-3">Gemini AI가 {slideCount}장 슬라이드 구성을 만듭니다. (무료)</p>
            <div className="flex gap-2">
              <button onClick={generatePlan} className="flex-1 btn-primary min-h-0 py-3">
                {planLoading ? '생성 중…' : '✅ 생성합니다'}
              </button>
              <button onClick={() => setConfirmPlan(false)} className="flex-1 btn-secondary min-h-0 py-3">
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={generatePlan}
            disabled={planLoading || !agendaId || !proposalText.trim()}
            className="btn-primary disabled:opacity-50 text-xl py-4"
          >
            {planLoading ? '⏳ 구성안 생성 중…' : '📐 슬라이드 구성안 생성 (Gemini)'}
          </button>
        )}
      </div>

      {planError && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
          {planError}
        </div>
      )}

      {/* ── STEP 2: 슬라이드 구성안 결과 ─────────────────────────── */}
      {deck && (
        <div className="mt-8">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-black text-navy-800 text-xl">{deck.deckTitle}</h2>
                {deck.subtitle && <p className="text-gray-500 text-sm mt-0.5">{deck.subtitle}</p>}
                <p className="text-teal-600 text-sm mt-1">
                  {deck.slideCount}장 · {deck.aspectRatio} · {deck.style}
                </p>
              </div>
              <button
                onClick={copyAllMarkdown}
                className="text-sm border border-navy-200 text-navy-600 hover:bg-navy-50 px-3 py-2 rounded-lg min-h-0"
              >
                MD 복사
              </button>
            </div>
          </div>

          {/* 슬라이드 카드 목록 */}
          <div className="flex flex-col gap-4 mb-6">
            {deck.slides.map((slide) => (
              <SlideCard
                key={slide.slideNumber}
                slide={slide}
                image={images.find((img) => img.slideNumber === slide.slideNumber)}
                onCopyPrompt={(p) => navigator.clipboard.writeText(p).catch(() => {})}
              />
            ))}
          </div>

          {/* ── STEP 3: DALL-E 이미지 생성 ──────────────────────── */}
          {!allImagesReady && (
            <div className="border-2 border-dashed border-navy-200 rounded-2xl p-5 mb-4">
              <h3 className="font-bold text-navy-800 text-lg mb-1">🎨 DALL-E 3 이미지 생성</h3>
              <p className="text-gray-500 text-sm mb-3 leading-relaxed">
                각 슬라이드 배경 이미지를 ChatGPT DALL-E 3로 생성합니다.
              </p>
              <div className="bg-amber-50 rounded-xl px-3 py-2 mb-4">
                <p className="text-amber-700 text-sm font-medium">
                  💰 예상 비용: 약 <strong>${totalCost} USD</strong> ({deck.slides.length}장 × $0.04)
                </p>
                <p className="text-amber-600 text-xs mt-0.5">
                  DALL-E 3 standard 1792×1024 기준 · OpenAI API 키 필요
                </p>
              </div>

              {/* 진행률 */}
              {imgLoading && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-navy-600 mb-1">
                    <span>이미지 생성 중... {imgProgress}/{deck.slides.length}장</span>
                    <span>{Math.round((imgProgress / deck.slides.length) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-teal-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(imgProgress / deck.slides.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-2 text-center">
                    잠시만 기다려주세요. DALL-E가 이미지를 그리고 있습니다…
                  </p>
                </div>
              )}

              {imgError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-red-600 text-sm">
                  {imgError}
                </div>
              )}

              {confirmImg ? (
                <div className="flex gap-2">
                  <button
                    onClick={generateImages}
                    disabled={imgLoading}
                    className="flex-1 btn-teal min-h-0 py-3 text-base"
                  >
                    {imgLoading ? `생성 중… (${imgProgress}/${deck.slides.length})` : '✅ 이미지 생성 시작'}
                  </button>
                  <button
                    onClick={() => setConfirmImg(false)}
                    disabled={imgLoading}
                    className="flex-1 btn-secondary min-h-0 py-3"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmImg(true)}
                  disabled={imgLoading}
                  className="w-full btn-teal text-xl py-4"
                >
                  🎨 DALL-E 3 이미지 생성하기
                </button>
              )}
            </div>
          )}

          {/* ── STEP 4: PPT 다운로드 ─────────────────────────────── */}
          {allImagesReady && (
            <div className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎉</span>
                <h3 className="font-black text-teal-800 text-lg">이미지 생성 완료!</h3>
              </div>
              <p className="text-teal-700 text-sm mb-4 leading-relaxed">
                {images.length}장의 슬라이드 이미지가 준비되었습니다.<br />
                PPT 파일로 다운로드하여 발표에 사용하세요.
              </p>
              <button
                onClick={downloadPPT}
                disabled={pptLoading}
                className="w-full btn-teal text-xl py-4 disabled:opacity-70"
              >
                {pptLoading ? '⏳ PPT 파일 생성 중…' : '📥 PPT 파일 다운로드 (.pptx)'}
              </button>
              <p className="text-teal-600 text-xs text-center mt-2">
                PowerPoint, Keynote, Google Slides에서 열 수 있습니다
              </p>

              {/* 이미지 재생성 버튼 */}
              <button
                onClick={() => { setImages([]); setConfirmImg(false) }}
                className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2 min-h-0"
              >
                ↺ 이미지 다시 생성하기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
