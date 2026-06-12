import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAgenda } from '../data/agendas'
import { supabase } from '../lib/supabase'
import { useRole } from '../context/RoleContext'
import { HtmlSlideThumb } from './SlideEditorPage'
import { ACCENT_COLORS } from '../types/htmlSlide'
import type { HSlide } from '../types/htmlSlide'

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
  const [htmlSlides, setHtmlSlides] = useState<HSlide[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [agendaId])

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
      if (Array.isArray(sess.html_slides) && sess.html_slides.length > 0) {
        setHtmlSlides(sess.html_slides)
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

  /* AI 초안 생성 → DB 저장 후 슬라이드 에디터로 이동 */
  const handleGenerateAndOpen = async () => {
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
        { label: '왜 이 정책이 필요한가', body: [tableIntro || agenda?.whyImportant, ...agreeOps.map(t => `✅ "${t}"`)].filter(Boolean).join('\n') },
        { label: '시민들이 나눈 이야기', body: tiroSummary || [...agreeOps.map(t => `✅ ${t}`), ...concerns.map(t => `⚠️ ${t}`), ...improves.map(t => `💡 ${t}`)].join('\n') || '시민들이 다양한 의견을 나눴습니다.' },
        { label: '최종 정책 제안', body: [...improves, ...firstActs.map(t => `[우선실행] ${t}`)].join('\n') || `${title} 실현을 위한 제도 정비\n주민 참여 기구 구성\n단계별 시범사업 추진` },
        { label: '기대 효과와 우선 과제', body: [agenda?.expectedEffect, ...keySents].filter(Boolean).join('\n') || '주민 자치 역량 강화' },
      ]

      const { makeId, defaultTextEl } = await import('../types/htmlSlide')
      const newSlides: HSlide[] = slideContents.map((sc, i) => {
        const accent = ACCENT_COLORS[i]
        const bg = htmlSlides?.[i]?.bg || '#1a2458'
        const isFirst = i === 0
        const mainText = isFirst ? title : sc.body
        return {
          id: htmlSlides?.[i]?.id || makeId(),
          bg,
          elements: [
            defaultTextEl(sc.label, { id: makeId(), x: 40, y: 18, w: 880, h: 50, fontSize: 13, color: accent, bold: true, z: 2 }),
            defaultTextEl(mainText, { id: makeId(), x: 40, y: 78, w: 880, h: isFirst ? 320 : 390, fontSize: isFirst ? 40 : 21, color: '#ffffff', bold: isFirst, z: 1, lineHeight: isFirst ? 1.3 : 1.75 }),
            ...(isFirst && sc.body ? [defaultTextEl(sc.body, { id: makeId(), x: 40, y: 420, w: 880, h: 80, fontSize: 14, color: accent, z: 3 })] : []),
          ],
        }
      })

      await supabase.from('table_sessions').upsert({
        policy_id: agendaId,
        table_intro: tableIntro,
        tiro_url: tiroUrl || null,
        tiro_summary: tiroSummary || null,
        html_slides: newSlides,
      })

      navigate(`/slide-editor/${agendaId}`)
    } catch {
      alert('AI 초안 생성 실패. 에디터에서 직접 작성하세요.')
      navigate(`/slide-editor/${agendaId}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveInfo = async () => {
    setSaving(true)
    try {
      await supabase.from('table_sessions').upsert({
        policy_id: agendaId,
        table_intro: tableIntro,
        tiro_url: tiroUrl || null,
        tiro_summary: tiroSummary || null,
      })
      alert('저장되었습니다.')
    } catch { alert('저장 실패') }
    finally { setSaving(false) }
  }

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
          placeholder="Tiro 한 페이지 요약본 붙여넣기 (슬라이드 3장에 반영)"
          rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-teal-400" />
      </div>

      {/* 중간 저장 */}
      <button onClick={handleSaveInfo} disabled={saving}
        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl text-sm transition-colors">
        {saving ? '저장 중...' : '💾 위 내용 저장'}
      </button>

      {/* ③ 슬라이드 편집기 진입 */}
      <div className="bg-[#1a2458] rounded-2xl p-5">
        <h2 className="font-black text-white text-base mb-1">③ HTML 발표 슬라이드 편집</h2>
        <p className="text-white/50 text-xs mb-4">
          의견 {opinions.length}개 · Tiro {tiroSummary ? '✅' : '없음'} · 사진 {photos.length}장
        </p>

        {/* 현재 슬라이드 썸네일 미리보기 */}
        {htmlSlides && (
          <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
            {htmlSlides.slice(0, 5).map((sl, i) => (
              <div key={sl.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                <HtmlSlideThumb slide={sl} width={88} onClick={() => navigate(`/slide-editor/${agendaId}`)} />
                <span className="text-white/40 text-[10px]">{i + 1}장</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button onClick={handleGenerateAndOpen} disabled={generating}
            className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-gray-500 text-white font-black py-4 rounded-xl text-base transition-colors">
            {generating ? '🤖 AI 초안 생성 중...' : '🤖 AI 초안 생성 후 편집기 열기'}
          </button>
          <button onClick={() => navigate(`/slide-editor/${agendaId}`)}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl text-sm transition-colors border border-white/20">
            ✏️ 편집기 바로 열기 {htmlSlides ? '(기존 슬라이드 있음)' : '(빈 슬라이드)'}
          </button>
        </div>
      </div>

    </div>
  )
}
