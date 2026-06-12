import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getAgenda } from '../data/agendas'
import { supabase } from '../lib/supabase'

type FinalContent = {
  agree_content?: string
  concern?: string
  improvement?: string
  first_action?: string
  key_sentence?: string
  core_problem?: string
  final_proposal?: string
  implementation?: string
  expected_effect?: string
  risks_and_supplements?: string
}

export default function DocumentsPage() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const agenda = getAgenda(agendaId || '')
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pptLoading, setPptLoading] = useState(false)

  useEffect(() => {
    supabase.from('table_sessions').select('*').eq('policy_id', agendaId).single()
      .then(({ data }) => { if (data) setSession(data); setLoading(false) })
  }, [agendaId])

  const content: FinalContent = session?.final_content || session?.ai_result || {}
  const policyNum = agendaId?.replace('policy-', '') || ''
  const dateStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  async function downloadPDF() {
    if (!agenda) return
    setPdfLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = 210
      const margin = 18
      const contentW = pageW - margin * 2
      let y = 0

      function addPage() { doc.addPage(); y = 20 }
      function checkY(needed = 20) { if (y > 270 - needed) addPage() }

      function addSection(label: string, content: string, color: [number, number, number] = [30, 58, 138]) {
        checkY(30)
        doc.setFillColor(...color)
        doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin + 3, y + 5.5)
        y += 12

        doc.setTextColor(40, 40, 40)
        doc.setFontSize(10.5)
        doc.setFont('helvetica', 'normal')
        const lines = doc.splitTextToSize(content || '-', contentW - 2)
        lines.forEach((line: string) => {
          checkY(8)
          doc.text(line, margin + 1, y)
          y += 6
        })
        y += 5
      }

      // 헤더
      doc.setFillColor(15, 23, 41)
      doc.rect(0, 0, 210, 32, 'F')
      doc.setFillColor(45, 212, 191)
      doc.rect(0, 30, 210, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('AI 투게더 정책 공론장', margin, 10)
      doc.text(`${policyNum}번 정책 · ${dateStr}`, pageW - margin, 10, { align: 'right' })
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      const titleLines = doc.splitTextToSize(agenda.title, contentW)
      doc.text(titleLines[0], margin, 22)
      if (titleLines[1]) doc.text(titleLines[1], margin, 29)

      y = 40

      // 핵심 문장 강조 박스
      if (content.key_sentence) {
        doc.setFillColor(240, 253, 250)
        doc.setDrawColor(45, 212, 191)
        doc.setLineWidth(0.5)
        doc.roundedRect(margin, y, contentW, 18, 2, 2, 'FD')
        doc.setTextColor(15, 118, 110)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('💬 핵심 발표 문장', margin + 3, y + 6)
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(6, 78, 59)
        const sentence = doc.splitTextToSize(content.key_sentence, contentW - 8)
        doc.text(sentence[0] || '', margin + 3, y + 13)
        y += 24
      }

      addSection('🎯 핵심 문제', content.core_problem || '')
      addSection('👍 공감한 내용', content.agree_content || '')
      addSection('😟 걱정되는 점', content.concern || '', [100, 60, 160])
      addSection('🔧 보완하면 좋을 점', content.improvement || '', [60, 100, 160])
      addSection('🚀 먼저 실행할 내용', content.first_action || '', [20, 120, 100])
      addSection('📋 최종 정책 제안', content.final_proposal || '', [15, 23, 41])
      addSection('⚙️ 실행 방법', content.implementation || '', [30, 80, 120])
      addSection('✨ 기대 효과', content.expected_effect || '', [20, 120, 80])
      addSection('⚠️ 우려점과 보완 방안', content.risks_and_supplements || '', [140, 80, 20])

      if (session?.tiro_summary) {
        addSection('🎙️ TIRO 녹취 요약', session.tiro_summary, [80, 60, 140])
      }

      // 푸터
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(180, 180, 180)
        doc.text(`AI Together 정책 공론장 · ${i}/${pageCount}`, pageW / 2, 291, { align: 'center' })
      }

      doc.save(`정책제안서_${policyNum}번_${agenda.title.slice(0, 10)}.pdf`)
    } catch (e) {
      console.error(e)
      alert('PDF 생성에 실패했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  async function downloadPPT() {
    if (!agenda) return
    setPptLoading(true)
    try {
      const { default: PptxGenJS } = await import('pptxgenjs')
      const pptx = new PptxGenJS()
      pptx.layout = 'LAYOUT_WIDE'

      const NAVY = '0f1729'
      const TEAL = '2dd4bf'
      const WHITE = 'FFFFFF'

      function addSlide(title: string, body: string, slideNum: number, total: number, accent = TEAL) {
        const slide = pptx.addSlide()

        // 배경
        slide.background = { color: NAVY }

        // 좌측 컬러 바
        slide.addShape(pptx.ShapeType.rect, {
          x: 0, y: 0, w: 0.08, h: 7.5,
          fill: { color: accent },
          line: { color: accent },
        })

        // 슬라이드 번호
        slide.addText(`${slideNum} / ${total}`, {
          x: 12.3, y: 7.0, w: 1.0, h: 0.35,
          fontSize: 9, color: '888888', align: 'right',
        })

        // 제목
        slide.addText(title, {
          x: 0.4, y: 0.3, w: 12.5, h: 0.9,
          fontSize: 22, bold: true, color: TEAL,
        })

        // 구분선
        slide.addShape(pptx.ShapeType.line, {
          x: 0.4, y: 1.15, w: 12.5, h: 0,
          line: { color: accent, width: 1, transparency: 60 },
        })

        // 본문
        if (body) {
          slide.addText(body, {
            x: 0.4, y: 1.3, w: 12.5, h: 5.8,
            fontSize: 16, color: 'dddddd',
            valign: 'top',
            wrap: true,
            isTextBox: true,
          })
        }

        return slide
      }

      const slides = [
        { title: `${policyNum}번 정책`, body: agenda.title, accent: TEAL, isCover: true },
        { title: '🎯 핵심 문제', body: content.core_problem || '-' },
        { title: '👍 공감한 내용 · 😟 걱정되는 점', body: `[공감한 내용]\n${content.agree_content || '-'}\n\n[걱정되는 점]\n${content.concern || '-'}` },
        { title: '🔧 보완점 · 🚀 먼저 할 일', body: `[보완하면 좋을 점]\n${content.improvement || '-'}\n\n[먼저 실행할 내용]\n${content.first_action || '-'}` },
        { title: '📋 최종 정책 제안', body: content.final_proposal || '-' },
        { title: '⚙️ 실행 방법 · ✨ 기대 효과', body: `[실행 방법]\n${content.implementation || '-'}\n\n[기대 효과]\n${content.expected_effect || '-'}` },
        { title: '⚠️ 우려점과 보완 방안', body: content.risks_and_supplements || '-' },
        { title: '💬 핵심 발표 문장', body: content.key_sentence || '-', accent: '14b8a6', isKeySlide: true },
      ]

      const total = slides.length

      slides.forEach((s, i) => {
        if ((s as any).isCover) {
          const slide = pptx.addSlide()
          slide.background = { color: NAVY }
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: TEAL }, line: { color: TEAL } })
          slide.addText('AI 투게더 정책 공론장', { x: 0.4, y: 1.5, w: 12.5, h: 0.6, fontSize: 16, color: '888888' })
          slide.addText(s.title, { x: 0.4, y: 2.1, w: 12.5, h: 0.8, fontSize: 24, bold: true, color: TEAL })
          slide.addText(agenda.title, { x: 0.4, y: 2.9, w: 12.5, h: 2.0, fontSize: 32, bold: true, color: WHITE, wrap: true })
          slide.addText(dateStr, { x: 0.4, y: 6.8, w: 12.5, h: 0.5, fontSize: 12, color: '666666' })
          slide.addText(`${i + 1} / ${total}`, { x: 12.3, y: 7.0, w: 1.0, h: 0.35, fontSize: 9, color: '888888', align: 'right' })
          return
        }

        if ((s as any).isKeySlide) {
          const slide = pptx.addSlide()
          slide.background = { color: '0a2020' }
          slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: '14b8a6' }, line: { color: '14b8a6' } })
          slide.addText(s.title, { x: 0.4, y: 0.4, w: 12.5, h: 0.8, fontSize: 22, bold: true, color: '14b8a6' })
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.4, y: 1.5, w: 12.5, h: 4.5,
            fill: { color: '0d3333' },
            line: { color: '14b8a6', width: 1.5 },
            rectRadius: 0.15,
          })
          slide.addText(s.body, {
            x: 0.7, y: 1.8, w: 12.0, h: 4.0,
            fontSize: 22, bold: true, color: 'e2fafa',
            valign: 'middle', align: 'center', wrap: true, isTextBox: true,
          })
          slide.addText(`${i + 1} / ${total}`, { x: 12.3, y: 7.0, w: 1.0, h: 0.35, fontSize: 9, color: '888888', align: 'right' })
          return
        }

        addSlide(s.title, s.body, i + 1, total, s.accent || TEAL)
      })

      await pptx.writeFile({ fileName: `정책발표_${policyNum}번_${agenda.title.slice(0, 10)}.pptx` })
    } catch (e) {
      console.error(e)
      alert('PPTX 생성에 실패했습니다.')
    } finally {
      setPptLoading(false)
    }
  }

  if (!agenda) return <div className="p-8 text-center text-gray-500">정책을 찾을 수 없습니다.</div>

  const fields = [
    { key: 'core_problem', label: '🎯 핵심 문제' },
    { key: 'agree_content', label: '👍 공감한 내용' },
    { key: 'concern', label: '😟 걱정되는 점' },
    { key: 'improvement', label: '🔧 보완하면 좋을 점' },
    { key: 'first_action', label: '🚀 먼저 실행할 내용' },
    { key: 'final_proposal', label: '📋 최종 정책 제안' },
    { key: 'implementation', label: '⚙️ 실행 방법' },
    { key: 'expected_effect', label: '✨ 기대 효과' },
    { key: 'risks_and_supplements', label: '⚠️ 우려점과 보완 방안' },
    { key: 'key_sentence', label: '💬 핵심 발표 문장' },
  ]

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* 헤더 */}
      <div className="mb-4">
        <Link to={`/operator/${agendaId}`} className="text-gray-400 text-sm underline">← 운영자 페이지로</Link>
        <div className="mt-2">
          <span className="text-xs text-gray-400">{policyNum}번 정책 · 문서 생성</span>
          <h1 className="text-xl font-black text-navy-800 leading-tight mt-1">{agenda.title}</h1>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">데이터 불러오는 중...</div>
      ) : !session?.is_confirmed ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-amber-700 font-bold">⚠️ 아직 최종 확정이 완료되지 않았습니다.</p>
          <Link to={`/operator/${agendaId}`} className="text-teal-600 text-sm underline mt-2 block">운영자 페이지로 돌아가기</Link>
        </div>
      ) : (
        <>
          {/* 다운로드 버튼 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={downloadPDF}
              disabled={pdfLoading}
              className="bg-navy-700 hover:bg-navy-800 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl transition-colors"
            >
              {pdfLoading ? '생성 중...' : '📄 PDF 다운로드'}
            </button>
            <button
              onClick={downloadPPT}
              disabled={pptLoading}
              className="bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl transition-colors"
            >
              {pptLoading ? '생성 중...' : '📊 PPTX 다운로드'}
            </button>
          </div>

          {/* 확정된 내용 미리보기 */}
          <h2 className="font-bold text-navy-700 mb-3">확정된 내용 미리보기</h2>

          {content.key_sentence && (
            <div className="bg-teal-50 border-2 border-teal-300 rounded-2xl p-4 mb-4">
              <p className="text-xs font-bold text-teal-600 mb-1">💬 핵심 발표 문장</p>
              <p className="text-teal-900 font-bold text-base leading-relaxed">{content.key_sentence}</p>
            </div>
          )}

          <div className="space-y-3">
            {fields.filter(f => f.key !== 'key_sentence').map(field => (
              <div key={field.key} className="card">
                <p className="text-xs font-bold text-gray-500 mb-1">{field.label}</p>
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                  {(content as any)[field.key] || <span className="text-gray-300">-</span>}
                </p>
              </div>
            ))}

            {session?.tiro_summary && (
              <div className="card">
                <p className="text-xs font-bold text-gray-500 mb-1">🎙️ TIRO 녹취 요약</p>
                <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{session.tiro_summary}</p>
                {session.tiro_url && (
                  <a href={session.tiro_url} target="_blank" rel="noopener noreferrer"
                    className="text-teal-600 text-xs underline mt-2 block">
                    TIRO 원본 링크 →
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
