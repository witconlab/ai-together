const WORKER_URL = import.meta.env.VITE_WORKER_URL || 'http://localhost:8787'

type AgendaContext = {
  title: string
  summary: string
  whyImportant: string
  expectedEffect: string
  referenceUrls?: string[]
}

type ChatRequest = {
  agendaId: string
  message: string
  sessionId: string
  agendaContext?: AgendaContext
}

type ChatResponse = {
  answer: string
  sources: Array<{ title: string; page?: string; snippet: string }>
  discussionPoints: string[]
  suggestedDiscussionQuestion: string
}

type PolicyProposalRequest = {
  agendaId: string
  deliberationSummary: string
  targetAudience: string
}

type PresentationRequest = {
  proposalText: string
  duration: string
  audience: string
}

type SlideDeckRequest = {
  agendaId: string
  proposalText: string
  presentationText: string
  slideCount: number
  aspectRatio: '16:9'
  style: string
}

type GenerateSlideImageRequest = {
  slideNumber: number
  title: string
  imagePrompt: string
  style: string
}

export type GenerateSlideImageResponse = {
  slideNumber: number
  title: string
  imageBase64: string
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '서버 오류가 발생했습니다.' }))
    throw new Error((err as { message?: string }).message || '서버 오류가 발생했습니다.')
  }
  return res.json() as Promise<T>
}

export function getSessionId(): string {
  let id = sessionStorage.getItem('sessionId')
  if (!id) {
    id = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    sessionStorage.setItem('sessionId', id)
  }
  return id
}

export const api = {
  chat: (req: ChatRequest) => post<ChatResponse>('/api/chat', req),
  generatePolicy: (req: PolicyProposalRequest) =>
    post('/api/generate-policy-proposal', req),
  generatePresentation: (req: PresentationRequest) =>
    post('/api/generate-presentation', req),
  generateSlideDeck: (req: SlideDeckRequest) =>
    post('/api/generate-slide-deck', req),
  generateSlideImage: (req: GenerateSlideImageRequest) =>
    post<GenerateSlideImageResponse>('/api/generate-slide-image', req),
}
