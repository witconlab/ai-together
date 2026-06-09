import { Link } from 'react-router-dom'
import { agendas } from '../data/agendas'

const checklist = [
  '주요 제안 확인',
  '발표자 지정',
  '발표문 정리',
  '슬라이드 장표 구성 확인',
  '슬라이드 이미지 생성 확인',
  '최종 발표 자료 검토',
]

export default function Dashboard() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="section-title mb-0">운영진 대시보드</h1>
        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">운영진 전용</span>
      </div>
      <p className="text-gray-500 mb-6">실시간 제출 현황을 확인하고 발표를 준비합니다.</p>

      {/* 의제별 제출 현황 */}
      <div className="card mb-4">
        <h2 className="font-bold text-navy-700 mb-3">의제별 제출 현황</h2>
        <div className="flex flex-col gap-2">
          {agendas.map((a) => (
            <div key={a.agendaId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-700">{a.title}</span>
              <div className="flex items-center gap-2">
                {a.googleSheetUrl && (
                  <a
                    href={a.googleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-navy-500 hover:text-navy-700 underline"
                  >
                    Sheets
                  </a>
                )}
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">-건</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 발표 준비 체크리스트 */}
      <div className="card mb-6">
        <h2 className="font-bold text-navy-700 mb-3">발표 준비 체크리스트</h2>
        <div className="flex flex-col gap-2">
          {checklist.map((item, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 accent-navy-700 shrink-0" />
              <span className="text-gray-700">{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 운영진 기능 */}
      <h2 className="font-bold text-navy-700 mb-3 text-lg">최종 자료 만들기</h2>
      <div className="flex flex-col gap-3">
        <Link to="/policy-proposal" className="btn-primary text-center block">
          📄 최종 정책 제안 만들기
        </Link>
        <Link to="/presentation" className="btn-secondary text-center block">
          🎤 발표문 만들기
        </Link>
        <Link to="/slide-deck" className="btn-teal text-center block">
          🖼️ 발표용 슬라이드 이미지 만들기
        </Link>
      </div>
    </div>
  )
}
