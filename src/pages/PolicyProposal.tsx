import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { agendas } from '../data/agendas'
import { api } from '../utils/api'

const audiences = ['주민총회', '행정기관', '내부 보고', '카드뉴스']

export default function PolicyProposal() {
  const [agendaId, setAgendaId] = useState('')
  const [summary, setSummary] = useState('')
  const [audience, setAudience] = useState('주민총회')
  const [result, setResult] = useState<Record<string, string> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!agendaId || !summary.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.generatePolicy({ agendaId, deliberationSummary: summary, targetAudience: audience })
      setResult(res as Record<string, string>)
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="section-title">최종 정책 제안 만들기</h1>
      <p className="text-gray-500 mb-6 leading-relaxed">
        Google Sheets에 모인 숙의 결과를 붙여넣으면 정책 제안안으로 정리해 드립니다.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="font-bold text-navy-700 block mb-2">의제 선택</label>
          <select
            value={agendaId}
            onChange={(e) => setAgendaId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-navy-400"
          >
            <option value="">의제를 선택하세요</option>
            {agendas.map((a) => (
              <option key={a.agendaId} value={a.agendaId}>{a.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-bold text-navy-700 block mb-2">최종 숙의 결과 붙여넣기</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Google Sheets에서 복사한 숙의 결과를 여기에 붙여넣으세요."
            rows={6}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-navy-400 resize-none"
          />
        </div>

        <div>
          <label className="font-bold text-navy-700 block mb-2">제출 대상</label>
          <div className="flex flex-wrap gap-2">
            {audiences.map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={`px-4 py-2 rounded-xl text-base font-medium min-h-0 ${
                  audience === a
                    ? 'bg-navy-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !agendaId || !summary.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? '생성 중…' : '📄 정책 제안안 생성'}
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 flex flex-col gap-3">
          <h2 className="font-bold text-navy-700 text-lg">생성된 정책 제안안</h2>
          {[
            ['제안 제목', result.proposalTitle],
            ['문제 상황', result.problem],
            ['주민 의견 요약', result.residentOpinions],
            ['핵심 제안', result.coreProposal],
            ['실행 방법', result.implementation],
            ['기대 효과', result.expectedEffect],
            ['우려점과 보완 방안', result.risksAndSupplements],
          ].map(([label, content]) => (
            <div key={label} className="card">
              <h3 className="font-bold text-navy-600 text-sm mb-1">{label}</h3>
              <div className="text-gray-700 text-sm prose prose-sm max-w-none">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            </div>
          ))}
          {result.presentationSentence && (
            <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4">
              <h3 className="font-bold text-teal-700 mb-2">주민총회 발표용 한 문장</h3>
              <p className="text-teal-900 text-lg font-bold leading-relaxed">{result.presentationSentence}</p>
            </div>
          )}
          <button
            onClick={() => {
              const text = Object.entries(result)
                .map(([k, v]) => `[${k}]\n${v}`)
                .join('\n\n')
              navigator.clipboard.writeText(text).catch(() => {})
            }}
            className="btn-secondary"
          >
            전체 복사
          </button>
        </div>
      )}
    </div>
  )
}
