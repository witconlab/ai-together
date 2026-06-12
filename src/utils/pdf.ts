import jsPDF from 'jspdf'

type PolicyResult = {
  proposalTitle?: string
  problem?: string
  residentOpinions?: string
  coreProposal?: string
  implementation?: string
  expectedEffect?: string
  risksAndSupplements?: string
  presentationSentence?: string
  agendaTitle?: string
}

export function downloadPolicyPDF(result: PolicyResult, agendaTitle: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // 한글 지원을 위해 기본 폰트 사용 (유니코드 모드)
  const pageW = 210
  const margin = 20
  const contentW = pageW - margin * 2
  let y = 20

  function addSection(label: string, content: string) {
    if (y > 260) { doc.addPage(); y = 20 }

    // 섹션 레이블 배경
    doc.setFillColor(30, 58, 138) // navy
    doc.roundedRect(margin, y, contentW, 8, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(label, margin + 3, y + 5.5)
    y += 11

    // 내용
    doc.setTextColor(30, 30, 30)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const lines = doc.splitTextToSize(content || '-', contentW)
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20 }
      doc.text(line, margin, y)
      y += 6
    })
    y += 4
  }

  // 헤더
  doc.setFillColor(30, 58, 138)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('AI Together', margin, 10)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(result.proposalTitle || '정책 제안서', margin, 21)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(agendaTitle, pageW - margin, 21, { align: 'right' })

  y = 36

  // 날짜
  doc.setTextColor(120, 120, 120)
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), margin, y)
  y += 10

  // 각 섹션
  addSection('문제 상황', result.problem || '')
  addSection('주민 의견 요약', result.residentOpinions || '')
  addSection('핵심 제안', result.coreProposal || '')
  addSection('실행 방법', result.implementation || '')
  addSection('기대 효과', result.expectedEffect || '')
  addSection('우려점과 보완 방안', result.risksAndSupplements || '')

  // 발표용 한 문장 강조 박스
  if (result.presentationSentence) {
    if (y > 240) { doc.addPage(); y = 20 }
    y += 2
    doc.setDrawColor(20, 184, 166) // teal
    doc.setLineWidth(0.8)
    doc.roundedRect(margin, y, contentW, 18, 2, 2)
    doc.setFillColor(240, 253, 250)
    doc.roundedRect(margin, y, contentW, 18, 2, 2, 'F')
    doc.setTextColor(15, 118, 110)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('주민총회 발표용 한 문장', margin + 3, y + 6)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(10, 60, 55)
    const sentence = doc.splitTextToSize(result.presentationSentence, contentW - 6)
    doc.text(sentence[0] || '', margin + 3, y + 13)
  }

  // 푸터
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(160, 160, 160)
    doc.text(`AI Together 공론장 운영센터 · ${i}/${pageCount}`, pageW / 2, 290, { align: 'center' })
  }

  const fileName = `정책제안서_${(result.proposalTitle || '제안').slice(0, 15)}_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.pdf`
  doc.save(fileName)
}
