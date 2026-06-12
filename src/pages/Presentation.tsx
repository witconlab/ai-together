import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../utils/api'

const durations = ['1분', '3분', '5분']
const audiences = ['주민총회', '행정기관', '내부 보고', '카드뉴스']

export default function Presentation() {
  const [proposalText, setProposalText] = useState('')
  const [duration, setDuration] = useState('3분')
  const [audience, setAudience] = useState('주민총회')
  const [result, setResult] = useState<{ script?: string; keyMessages?: string[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generate() {
    if (!proposalText.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.generatePresentation({ proposalText, duration, audience })
      setResult(res as { script?: string; keyMessages?: string[] })
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h1 className="section-title">발표문 만들기</h1>
      <p className="text-gray-500 mb-6 leading-relaxed">
        정책 제안안을 붙여넣으면 주민총회에서 바로 읽을 수 있는 발표문을 만들어 드립니다.
      </p>

      <div className="flex flex-col gap-4">
        <div>
          <label className="font-bold text-navy-700 block mb-2">정책 제안안 붙여넣기</label>
          <textarea
            value={proposalText}
            onChange={(e) => setProposalText(e.target.value)}
            placeholder="정책 제안안을 여기에 붙여넣으세요."
            rows={6}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 text-base focus:outline-none focus:border-navy-400 resize-none"
          />
        </div>

        <div>
          <label className="font-bold text-navy-700 block mb-2">발표 시간</label>
          <div className="flex gap-2">
            {durations.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`flex-1 py-3 rounded-xl text-base font-bold min-h-0 ${
                  duration === d ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-bold text-navy-700 block mb-2">발표 대상</label>
          <div className="flex flex-wrap gap-2">
            {audiences.map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className={`px-4 py-2 rounded-xl text-base font-medium min-h-0 ${
                  audience === a ? 'bg-navy-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generate}
          disabled={loading || !proposalText.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {loading ? '생성 중…' : '🎤 발표문 생성'}
        </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 flex flex-col gap-4">
          {result.keyMessages && result.keyMessages.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-navy-700 mb-3">핵심 문장 3개</h3>
              <div className="flex flex-col gap-2">
                {result.keyMessages.map((msg, i) => (
                  <div key={i} className="bg-teal-50 rounded-xl px-4 py-3">
                    <span className="text-teal-600 font-bold mr-2">{i + 1}.</span>
                    <span className="text-teal-900">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.script && (
            <div className="card">
              <h3 className="font-bold text-navy-700 mb-3">{duration} 발표문</h3>
              <div className="text-gray-700 leading-loose prose prose-sm max-w-none">
                <ReactMarkdown>{result.script}</ReactMarkdown>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(result.script || '').catch(() => {})}
                className="btn-secondary mt-4 w-full"
              >
                발표문 복사
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
