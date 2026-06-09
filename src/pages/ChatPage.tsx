import { useState, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { getAgenda } from '../data/agendas'
import { api, getSessionId } from '../utils/api'
import type { ChatMessage } from '../types'

export default function ChatPage() {
  const { agendaId } = useParams<{ agendaId: string }>()
  const agenda = getAgenda(agendaId || '')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  if (!agenda) {
    return (
      <div className="px-4 py-12 text-center text-gray-500">
        의제를 찾을 수 없습니다.
        <br />
        <Link to="/agendas" className="text-navy-600 underline mt-4 inline-block">
          의제 목록으로 돌아가기
        </Link>
      </div>
    )
  }

  async function send(msg: string) {
    if (!msg.trim() || loading) return
    setInput('')
    setError('')
    const userMsg: ChatMessage = { role: 'user', content: msg }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await api.chat({
        agendaId: agenda!.agendaId,
        message: msg,
        sessionId: getSessionId(),
      })
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        discussionQuestion: res.suggestedDiscussionQuestion,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-56px)]">
      {/* 상단 안내 */}
      <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
        <p className="text-amber-800 text-sm leading-relaxed">
          <span className="font-bold">이 챗봇은 정답을 알려주는 도구가 아닙니다.</span><br />
          자료를 바탕으로 쟁점을 정리하고 깊은 토론을 돕는 <span className="font-bold">숙의 보조자</span>입니다.
        </p>
      </div>

      <div className="bg-white border-b px-4 py-2">
        <h1 className="font-bold text-navy-800">{agenda.title}</h1>
        <p className="text-gray-400 text-xs">AI 숙의 보조 챗봇</p>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="py-6">
            <p className="text-gray-500 text-center mb-4 text-sm">질문 예시를 눌러 시작해 보세요</p>
            <div className="flex flex-col gap-2">
              {agenda.sampleQuestions.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  className="text-left bg-navy-50 hover:bg-navy-100 text-navy-800 text-sm rounded-xl px-4 py-3 border border-navy-100 min-h-0"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                msg.role === 'user'
                  ? 'bg-navy-700 text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] text-base'
                  : 'bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-4 max-w-[95%] shadow-sm'
              }
            >
              {msg.role === 'assistant' ? (
                <div>
                  <div className="prose prose-sm max-w-none text-gray-800">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400 font-medium mb-1">참고 자료</p>
                      {msg.sources.map((s, j) => (
                        <p key={j} className="text-xs text-gray-400">
                          · {s.title}{s.page ? ` p.${s.page}` : ''}
                        </p>
                      ))}
                    </div>
                  )}
                  {msg.discussionQuestion && (
                    <div className="mt-3 bg-teal-50 rounded-xl p-3">
                      <p className="text-xs text-teal-600 font-bold mb-1">💬 함께 토론해볼 질문</p>
                      <p className="text-sm text-teal-800">{msg.discussionQuestion}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-navy-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 bg-navy-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 bg-navy-300 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="bg-white border-t px-3 py-3 flex gap-2 items-end">
        <div className="flex-1">
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-base resize-none focus:outline-none focus:border-navy-400 min-h-[48px] max-h-32"
            placeholder="질문을 입력하세요…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
          />
        </div>
        <button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          className="bg-navy-700 disabled:bg-gray-200 text-white disabled:text-gray-400 rounded-xl px-4 py-3 font-bold shrink-0"
        >
          전송
        </button>
      </div>

      {/* 하단 결과 제출 링크 */}
      <div className="bg-teal-50 border-t border-teal-100 px-4 py-2 flex items-center justify-between">
        <p className="text-teal-700 text-sm">토론이 끝났나요?</p>
        <a
          href={agenda.googleFormUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-bold text-teal-600 hover:text-teal-800"
        >
          결과 제출하기 →
        </a>
      </div>
    </div>
  )
}
