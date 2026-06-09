import { useState } from 'react'
import { Link } from 'react-router-dom'
import { agendas } from '../data/agendas'

// 7단계 진행 체크리스트
const STAGES = [
  { num: 1, label: '정책 제안 공유', duration: '5분', icon: '📋' },
  { num: 2, label: 'AI 정책 학습', duration: '15분', icon: '🤖' },
  { num: 3, label: '숙의 토론', duration: '35분', icon: '💬' },
  { num: 4, label: '개별 정책 의견 제출', duration: '10분', icon: '📝' },
  { num: 5, label: '최종 정책 제안서 제출 및 Tiro 녹취록 제출', duration: '5분', icon: '📤' },
  { num: 6, label: '발표자 슬라이드 제작', duration: '10분', icon: '🖼️' },
  { num: 7, label: '최종 발표 준비 완료', duration: '10분', icon: '🎤' },
]

// 정책별 가상 제출 현황 (실제는 Google Sheets 연동)
type AgendaStatus = {
  agendaId: string
  submitted: number
  total: number
  stage: number
}

const initialStatus: AgendaStatus[] = agendas.map((a) => ({
  agendaId: a.agendaId,
  submitted: 0,
  total: 5,
  stage: 0,
}))

export default function Dashboard() {
  const [stageChecks, setStageChecks] = useState<boolean[]>(Array(7).fill(false))
  const [agendaStatus, setAgendaStatus] = useState<AgendaStatus[]>(initialStatus)
  const [activeTab, setActiveTab] = useState<'overview' | 'checklist' | 'materials'>('overview')

  const completedStages = stageChecks.filter(Boolean).length
  const currentStage = stageChecks.findIndex((v) => !v)
  const totalSubmitted = agendaStatus.reduce((sum, a) => sum + a.submitted, 0)
  const totalTables = agendaStatus.reduce((sum, a) => sum + a.total, 0)

  function toggleStage(i: number) {
    setStageChecks((prev) => {
      const next = [...prev]
      // 순서대로만 체크 가능
      if (i === 0 || prev[i - 1]) next[i] = !prev[i]
      return next
    })
  }

  function updateSubmitted(agendaId: string, delta: number) {
    setAgendaStatus((prev) =>
      prev.map((a) =>
        a.agendaId === agendaId
          ? { ...a, submitted: Math.max(0, Math.min(a.total, a.submitted + delta)) }
          : a
      )
    )
  }

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* 헤더 */}
      <div className="bg-navy-800 text-white px-4 py-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">운영진 전용</span>
        </div>
        <h1 className="text-2xl font-black">공론장 운영 대시보드</h1>
        <p className="text-white/60 text-sm mt-1">운영진 · 퍼실리테이터 · 기록자</p>

        {/* 전체 진행률 */}
        <div className="mt-4 bg-white/10 rounded-2xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/80 text-sm font-medium">전체 진행 단계</span>
            <span className="text-teal-300 font-bold">{completedStages} / 7단계</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3">
            <div
              className="bg-teal-400 h-3 rounded-full transition-all duration-500"
              style={{ width: `${(completedStages / 7) * 100}%` }}
            />
          </div>
          {currentStage >= 0 && (
            <p className="text-white/60 text-xs mt-2">
              현재: {STAGES[currentStage].icon} {STAGES[currentStage].label}
            </p>
          )}
          {completedStages === 7 && (
            <p className="text-teal-300 text-sm mt-2 font-bold">✅ 모든 단계 완료!</p>
          )}
        </div>

        {/* 제출 현황 요약 */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-teal-300">{totalSubmitted}</div>
            <div className="text-white/60 text-xs">총 제출</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-white">{totalTables}</div>
            <div className="text-white/60 text-xs">전체 테이블</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-amber-300">
              {totalTables > 0 ? Math.round((totalSubmitted / totalTables) * 100) : 0}%
            </div>
            <div className="text-white/60 text-xs">제출률</div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 bg-white sticky top-[56px] z-40">
        {[
          { key: 'overview', label: '📊 현황' },
          { key: 'checklist', label: '✅ 진행 체크' },
          { key: 'materials', label: '📄 자료 만들기' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex-1 py-3 text-sm font-bold min-h-0 border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-navy-700 text-navy-700'
                : 'border-transparent text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="px-4 py-5">

        {/* 📊 현황 탭 */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-navy-700 text-lg">정책별 제출 현황</h2>
            {agendaStatus.map((status) => {
              const agenda = agendas.find((a) => a.agendaId === status.agendaId)
              const pct = Math.round((status.submitted / status.total) * 100)
              return (
                <div key={status.agendaId} className="card">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-navy-800 text-base">{agenda?.title}</h3>
                      <p className="text-gray-400 text-xs mt-0.5">{agenda?.category}</p>
                    </div>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                      pct === 100 ? 'bg-teal-100 text-teal-700' :
                      pct >= 50 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {status.submitted}/{status.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        pct === 100 ? 'bg-teal-500' : 'bg-navy-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* 수동 제출 수 조정 (실제는 Sheets 연동) */}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">수동 업데이트</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateSubmitted(status.agendaId, -1)}
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold min-h-0 flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="font-bold text-navy-700 w-6 text-center">{status.submitted}</span>
                      <button
                        onClick={() => updateSubmitted(status.agendaId, 1)}
                        className="w-8 h-8 rounded-full bg-navy-100 text-navy-700 font-bold min-h-0 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {agenda?.googleSheetUrl && (
                    <a
                      href={agenda.googleSheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 text-xs text-navy-500 underline block"
                    >
                      Google Sheets에서 확인 →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ✅ 진행 체크 탭 */}
        {activeTab === 'checklist' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-navy-700 text-lg">진행 단계 체크리스트</h2>
              <span className="text-sm text-gray-400">{completedStages}/7 완료</span>
            </div>
            <p className="text-gray-400 text-sm -mt-1 mb-2">순서대로 완료 후 체크하세요.</p>

            {STAGES.map((stage, i) => {
              const done = stageChecks[i]
              const locked = i > 0 && !stageChecks[i - 1]
              const active = !done && !locked

              return (
                <button
                  key={i}
                  onClick={() => toggleStage(i)}
                  disabled={locked}
                  className={`w-full text-left rounded-2xl p-4 border-2 transition-all min-h-0 ${
                    done
                      ? 'bg-teal-50 border-teal-300'
                      : active
                      ? 'bg-white border-navy-300 shadow-sm'
                      : 'bg-gray-50 border-gray-100 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg font-black ${
                      done
                        ? 'bg-teal-500 text-white'
                        : active
                        ? 'bg-navy-700 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {done ? '✓' : stage.num}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{stage.icon}</span>
                        <span className={`font-bold text-base ${
                          done ? 'text-teal-700 line-through' :
                          active ? 'text-navy-800' : 'text-gray-400'
                        }`}>
                          {stage.label}
                        </span>
                      </div>
                      <span className={`text-sm ${done ? 'text-teal-500' : 'text-gray-400'}`}>
                        {stage.duration}
                        {done && ' · 완료'}
                        {active && ' · 진행 중'}
                        {locked && ' · 대기'}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}

            {completedStages === 7 && (
              <div className="mt-4 bg-teal-50 border-2 border-teal-300 rounded-2xl p-4 text-center">
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-teal-700 font-black text-lg">모든 단계 완료!</p>
                <p className="text-teal-600 text-sm mt-1">발표 준비가 완료되었습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 📄 자료 만들기 탭 */}
        {activeTab === 'materials' && (
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-navy-700 text-lg">최종 자료 만들기</h2>
            <p className="text-gray-500 text-sm -mt-2">최종 논의 내용을 바탕으로 순서대로 진행하세요.</p>

            {/* 1단계 */}
            <div className="card border-2 border-teal-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-teal-500 text-white font-black text-sm flex items-center justify-center shrink-0">1</div>
                <h3 className="font-bold text-navy-800 text-base">발표용 슬라이드 제작</h3>
              </div>
              <p className="text-gray-500 text-sm mb-2 leading-relaxed">
                정책 제안안을 입력하면 5장 슬라이드를 만들어 드립니다.
              </p>
              {/* GPT 바로가기 */}
              <a
                href="https://chatgpt.com/g/g-6a286481dfe881919b3c851a50f931eb-maeuljaci-jeongcaeg-seulraideu-meikeo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl px-4 py-3 mb-2 transition-colors"
              >
                <span className="text-lg">🤖</span>
                <span className="font-bold text-sm flex-1">ChatGPT GPT로 이미지 만들기</span>
                <span className="text-xs text-teal-200">추천 ↗</span>
              </a>
              <Link to="/slide-deck" className="btn-secondary text-center block text-sm py-2.5">
                🖼️ 구성안 생성 + API 자동 제작
              </Link>
            </div>

            {/* 2단계 */}
            <div className="card border-2 border-navy-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-navy-700 text-white font-black text-sm flex items-center justify-center shrink-0">2</div>
                <h3 className="font-bold text-navy-800 text-base">최종 정책 제안 만들기</h3>
              </div>
              <p className="text-gray-500 text-sm mb-3 leading-relaxed">
                숙의 결과를 붙여넣으면 정책 제안안 형식으로 정리해 드립니다.
              </p>
              <Link to="/policy-proposal" className="btn-primary text-center block">
                📄 정책 제안안 만들기
              </Link>
            </div>

            {/* 3단계 */}
            <div className="card border-2 border-navy-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-navy-600 text-white font-black text-sm flex items-center justify-center shrink-0">3</div>
                <h3 className="font-bold text-navy-800 text-base">발표문 만들기</h3>
              </div>
              <p className="text-gray-500 text-sm mb-3 leading-relaxed">
                정책 제안안을 주민총회 발표문으로 변환합니다.
              </p>
              <Link to="/presentation" className="btn-secondary text-center block">
                🎤 발표문 만들기
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
