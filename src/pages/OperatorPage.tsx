import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAgenda } from '../data/agendas'
import { supabase } from '../lib/supabase'
import { useRole } from '../context/RoleContext'
import { SlideThumbnail, PresentationMode } from '../components/SlideRenderer'

type SlideKey = 'slide1' | 'slide2' | 'slide3' | 'slide4' | 'slide5'

type Slides = {
  slide1_title: string
  slide1_keywords: string
  slide2: string
  slide3: string
  slide4: string
  slide5: string
}

const SLIDE_TABS: { key: SlideKey; short: string; full: string }[] = [
  { key: 'slide1', short: '정책 제목과 핵', full: '1장 · 정책 제목과 핵심 문제 키워드' },
  { key: 'slide2', short: '왜 이 정책이', full: '2장 · 왜 이 정책이 필요한가' },
  { key: 'slide3', short: '시민들이 테이블', full: '3장 · 시민들이 테이블에서 나눈 이야기' },
  { key: 'slide4', short: '최종 정책 제안', full: '4장 · 최종 정책 제안' },
  { key: 'slide5', short: '기대 효과와 우', full: '5장 · 기대 효과와 우선 과제' },
]

export default function OperatorPage() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const agenda = getAgenda(agendaId || '')
  const { role } = useRole()
  const navigate = useNavigate()

  useEffect(() => {
    if (role !== 'facilitator' && role !== 'recorder' && role !== 'admin') {
      navigate('/')
    }
  }, [role, navigate])

  const [_session, setSession] = useState<any>(null)
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
  const [slides, setSlides] = useState<Slides>({
    slide1_title: '', slide1_keywords: '',
    slide2: '', slide3: '', slide4: '', slide5: '',
  })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [{ data: sess }, { data: ops }] = await Promise.all([
      supabase.from('table_sessions').select('*').eq('policy_id', agendaId).single(),
      supabase.from('participant_opinions').select('*').eq('policy_id', agendaId),
    ])
    if (sess) {
      setSession(sess)
      setTiroUrl(sess.tiro_url || '')
      setTiroSummary(sess.tiro_summary || '')
      setTableIntro(sess.table_intro || agenda?.whyImportant || '')
      if (sess.photos) setPhotos(sess.photos)
      if (sess.slides) setSlides({ ...slides, ...sess.slides })
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

  const compressToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })

  const handlePhotoAdd = async (file: File) => {
    if (photos.length >= 5) { alert('최대 5장까지 업로드할 수 있습니다.'); return }
    setUploading(true)
    try {
      const dataUrl = await compressToBase64(file)
      const newPhotos = [...photos, dataUrl]
      setPhotos(newPhotos)
      await supabase.from('table_sessions').upsert({ policy_id: agendaId, photos: newPhotos })
    } catch (e) {
      console.error(e)
      alert('사진 처리에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoRemove = async (idx: number) => {
    const newPhotos = photos.filter((_, i) => i !== idx)
    setPhotos(newPhotos)
    await supabase.from('table_sessions').update({ photos: newPhotos }).eq('policy_id', agendaId)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const workerUrl = import.meta.env.VITE_WORKER_URL
      let data: any = null

      if (workerUrl) {
        const res = await fetch(`${workerUrl}/analyze-photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoUrl: photos[0],
            agendaTitle: agenda?.title,
            agendaSummary: agenda?.summary,
            tiroSummary,
            opinions: opinions.slice(0, 20),
          }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.message)
        data = json
      } else {
        // Fallback: generate from local agenda data
        const opTexts = opinions.slice(0, 10).map(o =>
          [o.agree_content, o.concern, o.improvement].filter(Boolean).join(' / ')
        ).join('\n')
        data = {
          policy_title: agenda?.title || '',
          keywords: (agenda?.tags || []).slice(0, 5),
          background: agenda?.whyImportant || '',
          discussion: opTexts
            ? `시민들은 다음과 같은 의견을 나눴습니다:\n${opTexts}`
            : (tiroSummary || `${agenda?.title}에 대해 참여 시민들이 다양한 시각을 공유하고 심층 토론을 진행했습니다.`),
          final_proposal: `${agenda?.title}을 실현하기 위해 다음을 제안합니다:\n- 관련 조례 및 제도 정비\n- 주민 참여 기구 구성\n- 단계별 시범사업 추진\n- 예산 확보 및 전담 부서 지정`,
          expected_effect: agenda?.expectedEffect || '주민 자치 역량 강화, 지역 현안 해결, 행정-주민 신뢰 구축',
        }
      }

      setSlides({
        slide1_title: data.policy_title || agenda?.title || '',
        slide1_keywords: (data.keywords || []).join('\n'),
        slide2: data.background || '',
        slide3: data.discussion || '',
        slide4: data.final_proposal || '',
        slide5: data.expected_effect || '',
      })
      await supabase.from('table_sessions').upsert({ policy_id: agendaId, ai_result: data })
    } catch (e) {
      alert('AI 생성에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase.from('table_sessions').upsert({
        policy_id: agendaId,
        table_intro: tableIntro,
        tiro_url: tiroUrl || null,
        tiro_summary: tiroSummary || null,
        slides,
        is_confirmed: true,
      })
      setSlidesSaved(true)
      alert('슬라이드가 저장되었습니다. 대시보드에서 확인하세요.')
    } catch (e) {
      alert('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const updateSlide = (key: keyof Slides, value: string) =>
    setSlides(prev => ({ ...prev, [key]: value }))

  if (!agenda) return <div className="p-8 text-center text-gray-500">정책을 찾을 수 없습니다.</div>

  const slideIdx = SLIDE_TABS.findIndex(t => t.key === activeSlide) + 1

  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5">

      {/* 헤더 */}
      <div>
        <span className="text-teal-600 text-xs font-bold">테이블 퍼실 · 기록자</span>
        <h1 className="text-2xl font-black text-navy-800 leading-tight mt-0.5">
          {agendaId?.replace('policy-', '')}번. {agenda.title}
        </h1>
        <p className="text-gray-400 text-xs mt-1">참여 의견 {opinions.length}개</p>
      </div>

      {/* 테이블 소개 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-black text-navy-800 text-base mb-1">테이블 소개 — 정책 제안 배경과 필요성</h2>
        <p className="text-gray-400 text-xs mb-3">참가자 '정책 알아보기'에 표시됩니다. 행사 전 미리 작성하세요.</p>
        <textarea
          value={tableIntro}
          onChange={e => setTableIntro(e.target.value)}
          placeholder={`이 정책은 ~한 문제에서 출발했습니다.\n현재 ~한 상황으로 주민 불편이 큽니다.\n그래서 ~을 함께 논의하고자 합니다.`}
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400"
        />
      </div>

      {/* ① 정리판 사진 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-black text-navy-800 text-base mb-1">
          ① 정리판 사진 <span className="text-gray-400 font-normal text-sm">(최대 5장)</span>
          <span className="text-teal-600 text-xs font-medium ml-2">→ 구글 드라이브 저장</span>
        </h2>
        <div className="flex flex-wrap gap-2 mt-3">
          {photos.map((url, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
              <img src={url} alt={`정리판${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => handlePhotoRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
              >✕</button>
            </div>
          ))}
          {photos.length < 5 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-teal-400 bg-teal-50 flex items-center justify-center text-teal-500 text-3xl hover:bg-teal-100 transition-colors"
            >
              {uploading ? '…' : '+'}
            </button>
          )}
        </div>
        <input type="file" accept="image/*" ref={fileRef} className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) {
              handlePhotoAdd(e.target.files[0])
              e.target.value = ''  // 같은 파일 재선택 가능하도록 초기화
            }
          }} />
      </div>

      {/* ② Tiro 회의록 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-black text-navy-800 text-base mb-3">② Tiro 회의록</h2>
        <input
          type="url"
          value={tiroUrl}
          onChange={e => setTiroUrl(e.target.value)}
          placeholder="Tiro 회의록 링크 (https://...)"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mb-3 focus:outline-none focus:border-teal-400"
        />
        <textarea
          value={tiroSummary}
          onChange={e => setTiroSummary(e.target.value)}
          placeholder="Tiro 한 페이지 요약본을 붙여넣기 (AI 생성 시 함께 활용)"
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400"
        />
      </div>

      {/* ③ AI 발표 텍스트 생성 */}
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
        <h2 className="font-black text-navy-800 text-base mb-1">③ 5장 발표 텍스트 자동 생성</h2>
        <p className="text-gray-500 text-xs mb-3">
          {photos.length > 0
            ? '사진 + 주민 의견 + Tiro 요약을 종합해 초안을 작성합니다.'
            : '정책 데이터 + 주민 의견 + Tiro 요약을 바탕으로 초안을 작성합니다. (사진 없이도 생성 가능)'}
        </p>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {generating ? '생성 중...' : '🤖 AI 발표 텍스트 생성'}
        </button>
      </div>

      {/* ④ 발표 슬라이드 편집 */}
      <div id="slide-editor" className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <h2 className="font-black text-navy-800 text-base mb-3">
          ④ 발표 슬라이드 편집
          <span className="text-gray-400 font-normal text-sm ml-1">— 슬라이드 탭을 눌러 수정하세요</span>
        </h2>

        {/* 탭 */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {SLIDE_TABS.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setActiveSlide(t.key)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-center min-w-[68px] ${
                activeSlide === t.key
                  ? 'bg-navy-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <div className="font-black">{i + 1}장</div>
              <div className="text-[10px] mt-0.5 leading-tight">{t.short}</div>
            </button>
          ))}
        </div>

        {/* 슬라이드 내용 */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-teal-600 font-bold text-sm mb-3">
            {SLIDE_TABS.find(t => t.key === activeSlide)?.full}
          </p>

          {activeSlide === 'slide1' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">정책 제목 (1장 대제목)</label>
                <input
                  type="text"
                  value={slides.slide1_title}
                  onChange={e => updateSlide('slide1_title', e.target.value)}
                  placeholder="예: 읍면동장 주민 선출제 도입"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">핵심 키워드 (한 줄 = 한 항목)</label>
                <textarea
                  value={slides.slide1_keywords}
                  onChange={e => updateSlide('slide1_keywords', e.target.value)}
                  placeholder={`키워드는 2~8자 짧은 단어로 (예: 주민자치\n전문성 강화)`}
                  rows={6}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400"
                />
                <p className="text-gray-400 text-xs mt-1">키워드는 2~8자 짧은 단어로 (예: 주민자치\n전문성 강화)</p>
              </div>
            </>
          ) : (
            <textarea
              value={slides[activeSlide as keyof Slides] as string}
              onChange={e => updateSlide(activeSlide as keyof Slides, e.target.value)}
              placeholder={`${slideIdx}장 내용을 입력하세요`}
              rows={8}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400"
            />
          )}
        </div>
      </div>

      {/* ⑤ 슬라이드 미리보기 + 발표 모드 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-navy-800 text-base">
            ⑤ PPT 슬라이드 미리보기
          </h2>
          <button
            onClick={() => setPresenting(true)}
            className="bg-[#1a2458] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-navy-700 transition-colors"
          >
            🖥️ 발표 모드
          </button>
        </div>

        {/* 5 thumbnails */}
        <div className="flex gap-3 overflow-x-auto pb-3">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0">
              <SlideThumbnail
                slides={slides}
                index={i}
                policyNum={agendaId?.replace('policy-', '')}
                isActive={activeSlide === `slide${i + 1}` as SlideKey}
                onClick={() => {
                  setActiveSlide(`slide${i + 1}` as SlideKey)
                  document.getElementById('slide-editor')?.scrollIntoView({ behavior: 'smooth' })
                }}
              />
              <span className="text-xs text-gray-400">{i + 1}장</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-2">슬라이드를 탭하면 위의 편집기에서 수정할 수 있습니다.</p>
      </div>

      {/* 최종 저장 */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-black py-5 rounded-2xl text-xl transition-colors"
      >
        {saving ? '저장 중...' : slidesSaved ? '✅ 저장 완료 — 다시 저장' : '✅ 최종 저장 (대시보드에 반영)'}
      </button>

      {/* 발표 모드 오버레이 */}
      {presenting && (
        <PresentationMode
          slides={slides}
          policyNum={agendaId?.replace('policy-', '')}
          onClose={() => setPresenting(false)}
        />
      )}

    </div>
  )
}
