import { useState } from 'react'
import { Link } from 'react-router-dom'

const VOTE_URL = 'https://maeuli.com/townE/home/programs/communication/view2?itemKey=5111&menu=246'

export default function VotePage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-[#1a2458] flex flex-col px-5 pt-12 pb-10">
      <div className="flex-1">
        <h1 className="text-3xl font-black text-white leading-tight mb-4">
          가장 중요한 정책에<br />한 표를 주세요
        </h1>
        <p className="text-white/60 text-base leading-relaxed mb-10">
          아래 버튼을 누르면 투표 화면(마을e척척)으로 이동합니다.<br />
          1인 1표입니다.
        </p>

        <button
          onClick={() => setOpen(true)}
          className="w-full bg-teal-500 hover:bg-teal-400 text-white font-black py-5 rounded-2xl text-xl transition-colors"
        >
          🗳️ 투표하러 가기
        </button>

        <p className="text-white/40 text-sm text-center mt-8 leading-relaxed">
          투표 결과는 행사장 큰 화면에서<br />
          실시간으로 함께 보실 수 있습니다.
        </p>
      </div>

      <div className="text-center">
        <Link to="/" className="text-white/30 text-sm hover:text-white/50 transition-colors">
          ← 처음으로 돌아가기
        </Link>
      </div>

      {/* 투표 모달 */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="relative flex-1 mt-12 mx-2 mb-2 bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a2458] text-white flex-shrink-0">
              <span className="font-bold text-sm">🗳️ 우선순위 투표 (마을이)</span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>
            <iframe
              src={VOTE_URL}
              className="flex-1 w-full border-0"
              title="우선순위 투표"
            />
          </div>
        </div>
      )}
    </div>
  )
}
