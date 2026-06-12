import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRole } from '../context/RoleContext'
import { agendas } from '../data/agendas'

const OPERATOR_PASSWORD = '2026'

type OpStep = 'login' | 'menu' | 'table-pick'

export default function Landing() {
  const navigate = useNavigate()
  const { role, setRole, setPolicyId } = useRole()

  const [opStep, setOpStep] = useState<OpStep | null>(() =>
    role === 'admin' ? 'menu' : null
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const resetOp = () => { setOpStep(null); setPassword(''); setError('') }

  const handleLogin = () => {
    if (password !== OPERATOR_PASSWORD) { setError('비밀번호가 틀렸습니다.'); return }
    setPassword('')
    setError('')
    setOpStep('menu')
  }

  const handleTablePick = (agendaId: string) => {
    setRole('facilitator')
    setPolicyId(agendaId)
    navigate(`/operator/${agendaId}`)
  }

  const handleDashboard = () => {
    setRole('admin')
    navigate('/dashboard')
    resetOp()
  }

  /* ── 운영진 로그인 화면 ── */
  if (opStep === 'login') {
    return (
      <div className="min-h-dvh bg-[#1a2458] px-5 pt-10 pb-8">
        <button onClick={resetOp} className="text-white/50 text-sm mb-8 hover:text-white/80 transition-colors">
          ← 이전으로
        </button>
        <h1 className="text-3xl font-black text-white mb-2">운영진 입장</h1>
        <p className="text-white/50 text-base mb-8">운영진 암호를 입력해 주세요.</p>

        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="암호 입력"
          className="w-full bg-white border border-white/20 rounded-2xl px-6 py-5 text-[#1a2458] text-xl text-center placeholder-gray-400 focus:outline-none focus:border-teal-400 mb-3"
        />
        {error && <p className="text-red-400 text-sm mb-3 text-center">⚠️ {error}</p>}
        <button
          onClick={handleLogin}
          className="w-full bg-teal-500 hover:bg-teal-400 text-white font-black py-5 rounded-2xl text-xl transition-colors"
        >
          입장하기
        </button>
      </div>
    )
  }

  /* ── 운영진 메뉴 화면 ── */
  if (opStep === 'menu') {
    return (
      <div className="min-h-dvh bg-[#1a2458] px-5 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-10">
          <button onClick={resetOp} className="text-white/50 text-sm hover:text-white/80 transition-colors">
            ← 참가자 화면으로
          </button>
          <span className="bg-[#2a3570] text-teal-300 text-sm font-bold px-4 py-1.5 rounded-full">
            운영진 메뉴
          </span>
        </div>

        <h1 className="text-3xl font-black text-white mb-8">무엇을 하시겠어요?</h1>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setOpStep('table-pick')}
            className="w-full bg-white hover:bg-gray-50 text-[#1a2458] font-bold py-5 rounded-2xl text-xl transition-colors text-center"
          >
            🖊️ 테이블 퍼실·기록자
          </button>
          <button
            onClick={handleDashboard}
            className="w-full bg-white hover:bg-gray-50 text-[#1a2458] font-bold py-5 rounded-2xl text-xl transition-colors text-center"
          >
            📊 운영 대시보드
          </button>
          <button
            onClick={handleDashboard}
            className="w-full bg-white/10 hover:bg-white/20 text-white/60 font-bold py-5 rounded-2xl text-xl transition-colors text-center border border-white/10"
          >
            ⚙️ 행사 설정
          </button>
        </div>
      </div>
    )
  }

  /* ── 테이블 정책 선택 (퍼실·서기용) ── */
  if (opStep === 'table-pick') {
    return (
      <div className="min-h-dvh bg-white px-5 pt-8 pb-12">
        <div className="mb-6">
          <span className="text-teal-600 text-sm font-bold">테이블 퍼실 · 서기</span>
          <h1 className="text-3xl font-black text-[#1a2458] leading-tight mt-1">
            최종 숙의 → 발표 슬라이드 5장
          </h1>
          <p className="text-teal-600 text-sm font-medium mt-2">
            ✅ 정리판 사진 최대 5장 · 슬라이드 자동 생성
          </p>
        </div>

        <p className="text-[#1a2458] font-bold text-base mb-4">정책 테이블 선택</p>
        <div className="flex flex-wrap gap-2 mb-10">
          {agendas.map(a => (
            <button
              key={a.agendaId}
              onClick={() => handleTablePick(a.agendaId)}
              className="bg-white border border-gray-300 text-[#1a2458] font-medium px-4 py-2.5 rounded-full text-sm hover:border-teal-400 hover:bg-teal-50 transition-colors shadow-sm"
            >
              {a.agendaId.replace('policy-', '')}. {a.title}
            </button>
          ))}
        </div>

        <button onClick={() => setOpStep('menu')} className="text-gray-400 text-sm underline hover:text-gray-600 transition-colors">
          운영진 메뉴로
        </button>
      </div>
    )
  }

  /* ── 메인 랜딩 ── */
  return (
    <div className="min-h-dvh bg-[#1a2458] flex flex-col items-center justify-start px-5 pt-14 pb-8">
      <span className="bg-[#2a3570] text-gray-300 text-sm font-bold px-5 py-2 rounded-full mb-8">
        주제별 100분 토론
      </span>
      <h1 className="text-3xl font-black text-white text-center leading-tight mb-2">
        전남광주 통합특별시
      </h1>
      <h2 className="text-3xl font-black text-teal-400 text-center leading-tight mb-6">
        시민주권 정책공론장
      </h2>
      <p className="text-white/60 text-base text-center leading-relaxed mb-10">
        버튼을 눌러 참여해 주세요.<br />
        여러분의 의견이 정책이 됩니다.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <button
          onClick={() => navigate('/policy-pick/learn')}
          className="w-full bg-teal-500 hover:bg-teal-400 text-white font-black py-5 rounded-2xl text-lg transition-colors"
        >
          📚 우리 테이블 정책 알아보기
        </button>
        <button
          onClick={() => navigate('/policy-pick/opinion')}
          className="w-full bg-white hover:bg-gray-50 text-[#1a2458] font-black py-5 rounded-2xl text-lg transition-colors"
        >
          📝 정책 의견 제출하기
        </button>
        <button
          onClick={() => navigate('/vote')}
          className="w-full bg-white hover:bg-gray-50 text-[#1a2458] font-black py-5 rounded-2xl text-lg transition-colors"
        >
          🗳️ 우선순위 투표하기
        </button>
      </div>

      <button
        onClick={() => setOpStep('login')}
        className="mt-10 text-white/40 text-sm underline hover:text-white/60 transition-colors"
      >
        운영진 입장 →
      </button>
    </div>
  )
}
