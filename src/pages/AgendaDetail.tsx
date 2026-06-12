import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAgenda } from '../data/agendas'
import { supabase } from '../lib/supabase'

export default function AgendaDetail() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const agenda = getAgenda(agendaId || '')
  const [tableIntro, setTableIntro] = useState<string | null>(null)
  const [driveOpen, setDriveOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (!agendaId) return
    supabase
      .from('table_sessions')
      .select('table_intro')
      .eq('policy_id', agendaId)
      .single()
      .then(({ data }) => {
        if (data?.table_intro) setTableIntro(data.table_intro)
      })
  }, [agendaId])

  if (!agenda) {
    return (
      <div className="px-4 py-12 text-center text-gray-500">
        정책제안을 찾을 수 없습니다.
        <br />
        <a href="#/" className="text-blue-600 underline mt-4 inline-block">처음으로 돌아가기</a>
      </div>
    )
  }

  const num = agenda.agendaId.replace('policy-', '')

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <span className="tag">{agenda.category}</span>
        <span className="text-xs text-gray-400">{num}번 정책제안</span>
      </div>
      <h1 className="text-2xl font-black text-navy-800 mb-2 leading-tight">{agenda.title}</h1>
      <p className="text-gray-600 mb-6 leading-relaxed">{agenda.description}</p>

      <div className="card mb-4">
        <h2 className="font-bold text-teal-600 mb-2 text-base">이 정책이 나온 배경과 필요성</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {tableIntro || agenda.whyImportant}
        </p>
      </div>

      <div className="card mb-4">
        <h2 className="font-bold text-navy-700 mb-2 text-lg">기대 효과</h2>
        <p className="text-gray-700 leading-relaxed">{agenda.expectedEffect}</p>
      </div>

      {/* 액션 버튼 2개 */}
      <div className="flex flex-col gap-3 mt-6">
        <button
          onClick={() => agenda.driveUrl ? setDriveOpen(true) : null}
          className={`flex items-center justify-center gap-2 w-full border-2 font-bold py-4 rounded-2xl text-base transition-colors ${
            agenda.driveUrl
              ? 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              : 'bg-gray-50 border-dashed border-gray-200 text-gray-400 cursor-default'
          }`}
        >
          📄 정책제안서 {agenda.driveUrl ? '보기' : '(준비 중)'}
        </button>

        {agenda.notebookLmUrl && (
          <button
            onClick={() => setChatOpen(true)}
            className="btn-primary text-center text-xl py-4 w-full"
          >
            🤖 AI 정책매니저 챗봇
          </button>
        )}
      </div>

      {/* 챗봇 모달 */}
      {chatOpen && agenda.notebookLmUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/60" onClick={() => setChatOpen(false)}>
          <div
            className="relative flex-1 mt-12 mx-2 mb-2 bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a2458] text-white flex-shrink-0">
              <span className="font-bold text-sm">🤖 AI 정책매니저 챗봇</span>
              <div className="flex items-center gap-2">
                <a
                  href={agenda.notebookLmUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 text-xs underline hover:text-white/90"
                  onClick={e => e.stopPropagation()}
                >새 창에서 열기</a>
                <button
                  onClick={() => setChatOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white font-bold text-lg"
                >✕</button>
              </div>
            </div>
            <iframe
              src={agenda.notebookLmUrl}
              className="flex-1 w-full border-0"
              title="AI 정책매니저 챗봇"
              allow="microphone"
            />
          </div>
        </div>
      )}

      {/* Google Drive 모달 */}
      {driveOpen && agenda.driveUrl && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
          onClick={() => setDriveOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">
                  📁
                </div>
                <div>
                  <p className="font-black text-navy-800 text-base">정책제안서</p>
                  <p className="text-xs text-gray-400">구글 드라이브 · 공유 폴더</p>
                </div>
              </div>
              <button
                onClick={() => setDriveOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg hover:bg-gray-200"
              >✕</button>
            </div>

            {/* 정책 정보 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-gray-400 mb-1">{num}번 정책</p>
              <p className="font-bold text-navy-800 text-sm leading-snug">{agenda.title}</p>
            </div>

            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              구글 드라이브에서 정책제안서 초안을 확인할 수 있습니다.<br />
              아래 버튼을 누르면 새 창에서 열립니다.
            </p>

            <a
              href={agenda.driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDriveOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-[#1a2458] text-white font-bold py-4 rounded-2xl text-base hover:bg-[#232f6b] transition-colors"
            >
              🔗 구글 드라이브에서 열기
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
