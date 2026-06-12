import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAgenda } from '../data/agendas'
import { supabase } from '../lib/supabase'

function generateAnonymousId(policyId: string): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  const policyNum = policyId.replace('policy-', '')
  return `P${policyNum}-ANON-${num}`
}

export default function OpinionForm() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const navigate = useNavigate()
  const agenda = getAgenda(agendaId || '')

  const [form, setForm] = useState({ nickname: '', p: '', m: '', i: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!agenda) {
    return (
      <div className="px-4 py-12 text-center text-gray-500">
        정책을 찾을 수 없습니다.
      </div>
    )
  }

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.nickname.trim()) { setError('작성자명을 입력해 주세요.'); return }
    if (!form.p && !form.m && !form.i) { setError('최소 한 가지 항목을 입력해 주세요.'); return }
    setSubmitting(true)
    setError('')
    try {
      const anonymous_id = generateAnonymousId(agendaId!)
      const { error: dbError } = await supabase
        .from('participant_opinions')
        .insert({
          policy_id: agendaId!,
          anonymous_id,
          nickname: form.nickname || null,
          agree_content: form.p || null,
          concern: form.m || null,
          improvement: form.i || null,
        })
      if (dbError) throw dbError
      navigate(`/opinion-done/${agendaId}`)
    } catch (e) {
      console.error(e)
      setError('저장 중 오류가 발생했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const pmiFields = [
    { key: 'p', label: 'P — 좋았던 점', placeholder: '정책에 대해 공감되고 좋았던 점을 적어 주세요.', color: 'text-teal-700', border: 'focus:border-teal-400' },
    { key: 'm', label: 'M — 아쉬운 점', placeholder: '아쉬웠거나 더 논의가 필요한 점을 적어 주세요', color: 'text-orange-700', border: 'focus:border-orange-400' },
    { key: 'i', label: 'I — 흥미로운 점', placeholder: '새롭게 알게 됐거나 흥미로웠던 점을 적어 주세요', color: 'text-navy-700', border: 'focus:border-navy-400' },
  ]

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <span className="text-xs text-gray-400 font-medium">
          {agendaId?.replace('policy-', '')}번 정책
        </span>
        <h1 className="text-2xl font-black text-navy-800 leading-tight mt-1">
          {agenda.title}
        </h1>
        <p className="text-gray-500 text-sm mt-2">내 의견을 정리하고 저장해 주세요.</p>
      </div>

      {/* 작성자명 */}
      <div className="mb-5">
        <label className="block text-sm font-bold text-gray-700 mb-1">✏️ 작성자명</label>
        <input
          type="text"
          value={form.nickname}
          onChange={e => handleChange('nickname', e.target.value)}
          placeholder="이름을 입력해 주세요"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-navy-400"
        />
      </div>

      {/* P / M / I */}
      <div className="space-y-4 mb-6">
        {pmiFields.map(field => (
          <div key={field.key}>
            <label className={`block text-sm font-bold mb-1 ${field.color}`}>
              {field.label}
            </label>
            <textarea
              value={form[field.key as keyof typeof form]}
              onChange={e => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none resize-none ${field.border}`}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-red-600 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl text-xl transition-colors"
      >
        {submitting ? '저장 중...' : '✅ 의견 저장하기'}
      </button>

    </div>
  )
}
