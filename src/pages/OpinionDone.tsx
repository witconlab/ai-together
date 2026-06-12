import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getAgenda } from '../data/agendas'
import { supabase } from '../lib/supabase'

type Opinion = {
  id: string
  nickname: string | null
  agree_content: string | null
  concern: string | null
  improvement: string | null
  created_at: string
}

export default function OpinionDone() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const agenda = getAgenda(agendaId || '')
  const [tab, setTab] = useState<'done' | 'list'>('done')
  const [opinions, setOpinions] = useState<Opinion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (tab !== 'list') return
    setLoading(true)
    supabase
      .from('participant_opinions')
      .select('id, nickname, agree_content, concern, improvement, created_at')
      .eq('policy_id', agendaId!)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setOpinions(data || []); setLoading(false) })
  }, [tab, agendaId])

  return (
    <div className="max-w-lg mx-auto">
      {/* 탭 */}
      <div className="flex border-b border-gray-200">
        {(['done', 'list'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${
              tab === t
                ? 'text-teal-600 border-b-2 border-teal-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t === 'done' ? '✅ 저장 완료' : '📋 의견 보기'}
          </button>
        ))}
      </div>

      {/* 저장 완료 탭 */}
      {tab === 'done' && (
        <div className="px-4 py-10 text-center">
          <div className="text-6xl mb-6">✅</div>
          <h1 className="text-2xl font-black text-navy-800 mb-3">의견이 저장되었습니다</h1>
          <p className="text-gray-600 leading-relaxed mb-8">
            이 의견은 테이블 최종안의 참고자료로 활용되며,<br />
            행사 이후 정책 제안서 보완 자료로 사용될 수 있습니다.
          </p>
          {agenda && (
            <div className="bg-navy-50 rounded-2xl px-4 py-4 mb-8 text-left">
              <p className="text-xs text-gray-400 mb-1">{agendaId?.replace('policy-', '')}번 정책</p>
              <p className="font-bold text-navy-800">{agenda.title}</p>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <Link
              to={`/agenda/${agendaId}`}
              className="w-full border-2 border-navy-200 text-navy-700 font-bold py-4 rounded-2xl text-lg hover:bg-navy-50 transition-colors"
            >
              📄 정책 자료 다시 보기
            </Link>
            <Link to="/" className="text-gray-400 text-sm underline mt-2">
              처음으로 돌아가기
            </Link>
          </div>
        </div>
      )}

      {/* 의견 보기 탭 */}
      {tab === 'list' && (
        <div className="px-4 py-5">
          {loading && <p className="text-center text-gray-400 py-8">불러오는 중…</p>}
          {!loading && opinions.length === 0 && (
            <p className="text-center text-gray-400 py-8">아직 저장된 의견이 없습니다.</p>
          )}
          <div className="flex flex-col gap-4">
            {opinions.map(o => (
              <div key={o.id} className="bg-white rounded-2xl border border-gray-100 px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-navy-800">{o.nickname || '익명'}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(o.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {o.agree_content && (
                  <div className="mb-2">
                    <span className="text-xs font-bold text-teal-600">P — 좋았던 점</span>
                    <p className="text-sm text-gray-700 mt-0.5">{o.agree_content}</p>
                  </div>
                )}
                {o.concern && (
                  <div className="mb-2">
                    <span className="text-xs font-bold text-orange-600">M — 아쉬운 점</span>
                    <p className="text-sm text-gray-700 mt-0.5">{o.concern}</p>
                  </div>
                )}
                {o.improvement && (
                  <div>
                    <span className="text-xs font-bold text-navy-600">I — 흥미로운 점</span>
                    <p className="text-sm text-gray-700 mt-0.5">{o.improvement}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
