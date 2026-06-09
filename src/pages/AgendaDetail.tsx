import { useParams, Link } from 'react-router-dom'
import { getAgenda } from '../data/agendas'

export default function AgendaDetail() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const agenda = getAgenda(agendaId || '')

  if (!agenda) {
    return (
      <div className="px-4 py-12 text-center text-gray-500">
        의제를 찾을 수 없습니다.
        <br />
        <Link to="/agendas" className="text-navy-600 underline mt-4 inline-block">
          의제 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <span className="tag mb-3 inline-block">{agenda.category}</span>
      <h1 className="text-2xl font-black text-navy-800 mb-2">{agenda.title}</h1>
      <p className="text-gray-600 mb-6 leading-relaxed">{agenda.description}</p>

      {/* 핵심 정보 카드 */}
      <div className="card mb-4">
        <h2 className="font-bold text-navy-700 mb-2 text-lg">왜 중요한가요?</h2>
        <p className="text-gray-700 leading-relaxed">{agenda.whyImportant}</p>
      </div>

      <div className="card mb-4">
        <h2 className="font-bold text-navy-700 mb-2 text-lg">기대 효과</h2>
        <p className="text-gray-700 leading-relaxed">{agenda.expectedEffect}</p>
      </div>

      {/* AI 질문 예시 */}
      <div className="card mb-6">
        <h2 className="font-bold text-navy-700 mb-3 text-lg">AI에게 이렇게 질문해 보세요</h2>
        <div className="flex flex-col gap-2">
          {agenda.sampleQuestions.map((q, i) => (
            <div
              key={i}
              className="bg-navy-50 rounded-xl p-3 flex items-start gap-3"
            >
              <span className="text-navy-400 font-bold text-sm shrink-0">Q</span>
              <p className="text-navy-800 text-sm leading-relaxed flex-1">{q}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(q).catch(() => {})
                }}
                className="text-navy-400 hover:text-navy-600 text-xs shrink-0 min-h-0 h-auto py-0"
                aria-label="복사"
              >
                복사
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex flex-col gap-3">
        <Link
          to={`/chat/${agenda.agendaId}`}
          className="btn-primary text-center block text-xl py-4"
        >
          🤖 AI 숙의 보조자 열기
        </Link>
        <Link
          to="/question-guide"
          className="btn-secondary text-center block"
        >
          💡 질문 가이드 보기
        </Link>
        <a
          href={agenda.googleFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-teal text-center block"
        >
          📝 결과 제출하기
        </a>
      </div>
    </div>
  )
}
