import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { getAgenda } from '../data/agendas'
import { agendas } from '../data/agendas'

export default function SubmitResult() {
  const { agendaId } = useParams<{ agendaId?: string }>()
  const [selected, setSelected] = useState(agendaId || '')
  const agenda = selected ? getAgenda(selected) : null

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="section-title">결과 제출</h1>
      <p className="text-gray-500 mb-4 leading-relaxed">
        토론 결과를 Google Forms로 제출하면 Google Sheets에 자동 저장됩니다.
      </p>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-6">
        <p className="text-blue-700 text-sm leading-relaxed">
          📱 <strong>타이핑이 어려우시면</strong> 스마트폰 키보드의 마이크 버튼을 눌러 말씀해 주세요.<br />
          말한 내용이 자동으로 글자로 입력됩니다.
        </p>
      </div>

      {/* 정책제안 선택 */}
      <div className="mb-4">
        <label className="font-bold text-navy-700 block mb-2">정책제안 선택</label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-navy-400"
        >
          <option value="">정책제안을 선택하세요</option>
          {agendas.map((a) => (
            <option key={a.agendaId} value={a.agendaId}>{a.title}</option>
          ))}
        </select>
      </div>

      {/* 입력 항목 안내 */}
      <div className="card mb-6">
        <h2 className="font-bold text-navy-700 mb-3">제출 항목</h2>
        <ul className="space-y-2 text-gray-600 text-sm">
          {[
            '테이블 번호',
            '의제명',
            '핵심 문제',
            '주민 의견 요약',
            '제안 내용',
            '기대 효과',
            '우선순위',
            '발표자 이름',
          ].map((item, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-navy-100 text-navy-600 text-xs flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {agenda ? (
        <a
          href={agenda.googleFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-teal text-center block text-xl py-4"
        >
          📝 {agenda.title} 결과 제출하기
        </a>
      ) : (
        <button disabled className="w-full bg-gray-200 text-gray-400 font-bold py-4 rounded-xl text-xl cursor-not-allowed">
          정책제안을 먼저 선택하세요
        </button>
      )}

      <p className="text-xs text-gray-400 text-center mt-3">
        새 창에서 Google Forms가 열립니다
      </p>
    </div>
  )
}
