import { Link } from 'react-router-dom'
import { agendas } from '../data/agendas'

export default function AgendaList() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="section-title">의제 목록</h1>
      <p className="text-gray-500 mb-6 text-base">
        내 테이블 의제를 선택하세요.
      </p>

      <div className="flex flex-col gap-4">
        {agendas.map((agenda) => (
          <div key={agenda.agendaId} className="card">
            <div className="flex items-start justify-between mb-2">
              <span className="tag">{agenda.category}</span>
            </div>
            <h2 className="text-xl font-bold text-navy-800 mb-1">{agenda.title}</h2>
            <p className="text-gray-600 text-sm mb-3 leading-relaxed">{agenda.summary}</p>
            <div className="flex flex-wrap gap-1 mb-4">
              {agenda.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Link
                to={`/agenda/${agenda.agendaId}`}
                className="btn-primary text-center block"
              >
                🤖 정책 매니저 챗봇
              </Link>
              <Link
                to={`/chat/${agenda.agendaId}`}
                className="btn-secondary text-center block"
              >
                🤖 AI에게 질문하기
              </Link>
              <a
                href={agenda.googleFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-teal text-center block"
              >
                📝 결과 제출
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
