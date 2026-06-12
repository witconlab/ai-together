import { useState } from 'react'
import { Link } from 'react-router-dom'
import { agendas } from '../data/agendas'

const commonQuestions = [
  '이 정책제안을 70대 주민도 이해할 수 있게 쉽게 설명해 주세요.',
  '이 문제는 우리 동네에서 왜 중요한가요?',
  '다른 지역에서는 어떻게 해결했나요?',
  '실행하려면 어떤 준비가 필요할까요?',
  '반대 의견이 있다면 무엇일까요?',
  '주민총회에서 논의할 질문으로 바꿔 주세요.',
]

export default function QuestionGuide() {
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(text)
      setTimeout(() => setCopied(null), 1500)
    }).catch(() => {})
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="section-title">질문 가이드</h1>
      <p className="text-gray-500 mb-6 leading-relaxed">
        AI에게 어떤 질문을 해야 할지 모를 때 아래 질문을 눌러 복사하거나 바로 챗봇에서 사용해 보세요.
      </p>

      <h2 className="text-lg font-bold text-navy-700 mb-3">공통 질문</h2>
      <div className="flex flex-col gap-3 mb-8">
        {commonQuestions.map((q, i) => (
          <div key={i} className="card flex items-start gap-3">
            <p className="text-gray-700 flex-1 leading-relaxed">{q}</p>
            <button
              onClick={() => copy(q)}
              className="shrink-0 text-sm font-medium text-navy-500 hover:text-navy-700 min-h-0 h-auto py-1 px-2 border border-navy-200 rounded-lg"
            >
              {copied === q ? '✓' : '복사'}
            </button>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-navy-700 mb-3">정책별 챗봇 열기</h2>
      <div className="flex flex-col gap-2">
        {agendas.map((a) => (
          <Link
            key={a.agendaId}
            to={`/chat/${a.agendaId}`}
            className="card flex items-center justify-between hover:border-navy-200"
          >
            <span className="font-medium text-navy-800">{a.title}</span>
            <span className="text-navy-400 text-sm">챗봇 열기 →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
