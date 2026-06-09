import { Link } from 'react-router-dom'

const steps = [
  { num: '1', label: '의제 학습', desc: '테이블 의제를 확인하고\nAI에게 질문하세요' },
  { num: '2', label: '숙의 토론', desc: '질문 가이드를 참고해\n테이블 토론을 진행하세요' },
  { num: '3', label: '결과 제출', desc: '토론 결과를\nGoogle Forms로 제출하세요' },
  { num: '4', label: '발표 준비', desc: '운영진이 결과를 정리해\n주민총회에서 발표합니다' },
]

export default function Home() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-navy-800 to-navy-900 flex flex-col">
      {/* 히어로 */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 text-center">
        <div className="mb-2">
          <span className="bg-teal-400/20 text-teal-300 text-sm font-medium px-4 py-1 rounded-full">
            100분 공론장
          </span>
        </div>
        <h1 className="text-white text-3xl font-black mt-4 mb-2 leading-tight">
          AI Together<br />
          <span className="text-teal-400">공론장 운영센터</span>
        </h1>
        <p className="text-white/70 text-base mb-2">
          기술을 더하고, 숙의를 나누며, 마을을 잇다
        </p>
        <p className="text-white/50 text-sm max-w-xs mx-auto">
          AI는 정답을 드리지 않습니다.<br />
          주민 여러분의 깊은 토론을 돕습니다.
        </p>

        {/* 핵심 버튼 3개 */}
        <div className="w-full max-w-sm mt-10 flex flex-col gap-3">
          <Link
            to="/agendas"
            className="btn-teal text-center block text-xl py-4 rounded-2xl"
          >
            📋 의제 학습하기
          </Link>
          <Link
            to="/agendas"
            className="btn-secondary text-center block py-4 rounded-2xl"
          >
            📝 결과 제출하기
          </Link>
          <Link
            to="/discussion-guide"
            className="btn-secondary text-center block py-4 rounded-2xl"
          >
            💬 오늘의 진행 순서 보기
          </Link>
        </div>

        {/* 운영진 버튼 */}
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="text-white/40 hover:text-white/70 text-sm underline underline-offset-4"
          >
            운영진 대시보드 →
          </Link>
        </div>
      </div>

      {/* 오늘의 진행 흐름 */}
      <div className="bg-white/5 backdrop-blur px-5 py-8">
        <h2 className="text-white/80 text-lg font-bold text-center mb-5">
          오늘의 100분 진행 순서
        </h2>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {steps.map((s) => (
            <div key={s.num} className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="w-9 h-9 rounded-full bg-teal-400 text-navy-900 font-black text-lg flex items-center justify-center mx-auto mb-2">
                {s.num}
              </div>
              <div className="text-white font-bold text-sm mb-1">{s.label}</div>
              <div className="text-white/60 text-xs whitespace-pre-line leading-relaxed">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="bg-navy-900 px-5 py-5 text-center text-white/40 text-xs">
        Google Forms/Sheets 기반 운영 · Gemini AI 숙의 보조 챗봇 · GitHub Pages 배포
      </div>
    </div>
  )
}
