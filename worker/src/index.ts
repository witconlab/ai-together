/**
 * Cloudflare Worker – AI Together 공론장 운영센터 백엔드
 * v2.0
 * - Gemini API 키 5개 로테이션 (분당 제한 자동 우회)
 * - Semaphore Queue: 최대 8명 동시처리, 초과 시 대기 메시지
 * - RAG: Gemini File API에 미리 업로드한 PDF/TXT 파일 참조
 * - DALL-E 3: 슬라이드 이미지 생성 + base64 반환
 */

interface Env {
  // Gemini API 키 (5개 로테이션, GEMINI_API_KEY는 하위 호환 fallback)
  GEMINI_API_KEY?: string
  GEMINI_API_KEY_1?: string
  GEMINI_API_KEY_2?: string
  GEMINI_API_KEY_3?: string
  GEMINI_API_KEY_4?: string
  GEMINI_API_KEY_5?: string
  // OpenAI DALL-E
  OPENAI_API_KEY?: string
  // CORS
  ALLOWED_ORIGIN: string
}

// ═══════════════════════════════════════════════════════════════════
// 1. API Key Rotation (Gemini 무료 분당 제한 우회)
// ═══════════════════════════════════════════════════════════════════
let geminiKeyIndex = 0

function getGeminiKeys(env: Env): string[] {
  return [
    env.GEMINI_API_KEY_1,
    env.GEMINI_API_KEY_2,
    env.GEMINI_API_KEY_3,
    env.GEMINI_API_KEY_4,
    env.GEMINI_API_KEY_5,
    env.GEMINI_API_KEY, // fallback (구 버전 호환)
  ].filter((k): k is string => Boolean(k))
}

// ═══════════════════════════════════════════════════════════════════
// 2. Semaphore Queue (동시 요청 제한)
//    - 최대 8명 동시 처리
//    - 초과 시 대기열 추가 → 503 응답으로 대기 안내
// ═══════════════════════════════════════════════════════════════════
const MAX_CONCURRENT = 8
let activeRequests = 0
const waitQueue: Array<() => void> = []

function getQueueInfo() {
  return { active: activeRequests, waiting: waitQueue.length }
}

async function acquireSemaphore(): Promise<void> {
  if (activeRequests < MAX_CONCURRENT) {
    activeRequests++
    return
  }
  if (waitQueue.length >= 142) {
    throw new Error('QUEUE_FULL')
  }
  return new Promise((resolve) => waitQueue.push(resolve))
}

function releaseSemaphore(): void {
  const next = waitQueue.shift()
  if (next) {
    next() // 대기 중인 다음 요청 처리 시작
  } else {
    activeRequests = Math.max(0, activeRequests - 1)
  }
}

// ═══════════════════════════════════════════════════════════════════
// 3. RAG File Registry
//    Gemini File API에 파일을 미리 업로드한 후 URI를 여기에 등록하세요.
//
//    [업로드 방법]
//    curl https://generativelanguage.googleapis.com/upload/v1beta/files \
//      -H "X-Goog-Upload-Protocol: multipart" \
//      -F "metadata={display_name:'01_제안서.pdf'}" \
//      -F "file=@/path/to/file.pdf" \
//      "?key=YOUR_API_KEY"
//    → 응답의 file.uri 값을 아래에 등록
//
//    [주의] 무료 Gemini File API는 48시간 후 파일이 자동 삭제됩니다.
//           행사 전날 재업로드를 권장합니다.
// ═══════════════════════════════════════════════════════════════════
type FileRef = { uri: string; mimeType: string; displayName: string }

const FILE_REGISTRY: Record<string, FileRef[]> = {
  // 예시: 'policy-01': [{ uri: 'files/abc123def456', mimeType: 'application/pdf', displayName: '01_읍면동장선출제_제안서.pdf' }]
  'policy-01': [],
  'policy-02': [],
  'policy-03': [],
  'policy-04': [],
  'policy-05': [],
  'policy-06': [],
  'policy-07': [],
  'policy-08': [],
  'policy-09': [],
  'policy-10': [],
  'policy-11': [],
  'policy-12': [],
}

// ═══════════════════════════════════════════════════════════════════
// Rate Limit (sessionId 기준 5초)
// ═══════════════════════════════════════════════════════════════════
const rateLimitMap = new Map<string, number>()
function checkRateLimit(sessionId: string): boolean {
  const now = Date.now()
  const last = rateLimitMap.get(sessionId)
  if (last && now - last < 5000) return false
  rateLimitMap.set(sessionId, now)
  return true
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════
function corsHeaders(origin: string, allowedOrigin: string) {
  const ok =
    origin === allowedOrigin ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1')
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

function waitingResponse(cors: Record<string, string>) {
  const { waiting } = getQueueInfo()
  return json(
    {
      message: `잠시만 기다려주세요. 앞선 요청을 처리 중입니다... (현재 대기: ${waiting}명)`,
      waiting,
      isQueue: true,
    },
    503,
    cors
  )
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(binary)
}

// ═══════════════════════════════════════════════════════════════════
// Gemini API (key rotation + 429 자동 재시도)
// ═══════════════════════════════════════════════════════════════════
async function geminiCall(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  fileRefs?: FileRef[],
  maxTokens = 2048
): Promise<string> {
  const parts: unknown[] = [
    ...(fileRefs?.map((f) => ({ fileData: { mimeType: f.mimeType, fileUri: f.uri } })) ?? []),
    { text: prompt },
  ]
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 },
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GEMINI_${res.status}:${err.slice(0, 300)}`)
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

async function gemini(
  env: Env,
  prompt: string,
  systemInstruction?: string,
  fileRefs?: FileRef[],
  maxTokens = 2048
): Promise<string> {
  const keys = getGeminiKeys(env)
  if (keys.length === 0) throw new Error('Gemini API 키가 설정되지 않았습니다.')

  let lastError = new Error('unknown')
  for (let i = 0; i < keys.length; i++) {
    const key = keys[(geminiKeyIndex + i) % keys.length]
    try {
      const result = await geminiCall(key, prompt, systemInstruction, fileRefs, maxTokens)
      geminiKeyIndex = (geminiKeyIndex + i + 1) % keys.length // 다음 요청은 다음 키 사용
      return result
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      // 429 (분당 한도 초과) → 다음 키로 재시도
      if (lastError.message.includes('429') || lastError.message.includes('RESOURCE_EXHAUSTED')) {
        continue
      }
      throw lastError // 다른 오류는 즉시 throw
    }
  }
  throw new Error('모든 Gemini API 키의 요청 한도가 초과되었습니다. 잠시 후 다시 시도해 주세요.')
}

// ═══════════════════════════════════════════════════════════════════
// System Prompts
// ═══════════════════════════════════════════════════════════════════
const CHATBOT_SYSTEM = `당신은 주민 공론장의 AI 숙의 보조자입니다.

핵심 원칙:
- 정답을 대신 내리지 않습니다. 주민이 스스로 판단하도록 돕습니다.
- 제공된 정책 자료(첨부 파일 우선, 그 다음 정책 정보)를 기반으로 답변합니다.
- 자료에 없는 내용은 "제공된 자료에서 확인되지 않습니다"라고 말합니다.
- 70대 어르신도 이해할 수 있는 쉬운 한국어로 답변합니다.
- 찬성 관점과 우려 관점을 함께 제시합니다.
- 행정이 확정한 것처럼 단정하지 않습니다.

답변 구조 (반드시 이 순서로):
1. **쉬운 요약** (2-3문장, 아주 쉬운 말로)
2. **자료에서 확인되는 내용**
3. **함께 생각해볼 쟁점** (찬성/우려 양쪽)
4. **기대 효과 또는 우려점**
5. **💬 함께 토론해볼 질문** (1개, 마을 주민들이 토론할 수 있는 질문)`

// ═══════════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════════
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? ''
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)

    // GET /api/queue-status — 현재 대기 현황 조회
    if (url.pathname === '/api/queue-status' && request.method === 'GET') {
      return json(getQueueInfo(), 200, cors)
    }

    if (request.method !== 'POST') {
      return json({ message: 'Method not allowed' }, 405, cors)
    }

    try {
      // ── /api/chat ────────────────────────────────────────────────────
      if (url.pathname === '/api/chat') {
        const body = (await request.json()) as {
          agendaId: string
          message: string
          sessionId: string
          agendaContext?: {
            title: string
            summary: string
            whyImportant: string
            expectedEffect: string
            referenceUrls?: string[]
          }
        }

        if (!checkRateLimit(body.sessionId)) {
          return json({ message: '잠시 후 다시 시도해 주세요. (5초에 1회 제한)' }, 429, cors)
        }

        try {
          await acquireSemaphore()
        } catch {
          return waitingResponse(cors)
        }

        try {
          const fileRefs = FILE_REGISTRY[body.agendaId] ?? []
          const ctx = body.agendaContext
          const contextBlock = ctx
            ? `\n\n=== 이번 토론 정책 정보 ===
정책명: ${ctx.title}
요약: ${ctx.summary}

[제안 배경]
${ctx.whyImportant}

[기대 효과]
${ctx.expectedEffect}${
  ctx.referenceUrls?.length
    ? `\n\n[참고 자료 URL]\n${ctx.referenceUrls.map((u) => '- ' + u).join('\n')}`
    : ''
}
=========================`
            : ''

          const systemWithCtx = CHATBOT_SYSTEM + contextBlock
          const prompt = `주민 질문: ${body.message}\n\n위 질문에 답변해 주세요.`
          const answer = await gemini(env, prompt, systemWithCtx, fileRefs.length > 0 ? fileRefs : undefined)

          // 토론 질문 추출
          const lines = answer.split('\n')
          const hIdx = lines.findIndex((l) => l.includes('토론해볼 질문') || l.includes('💬'))
          let discussionQ = ''
          if (hIdx !== -1) {
            const nextLine = lines.slice(hIdx + 1).find((l) => l.trim())
            discussionQ = nextLine
              ? nextLine.replace(/^[*\-#\s\d.]+/, '').trim()
              : lines[hIdx]
                  .replace(/^.*토론해볼\s*질문[*\s:：]*/g, '')
                  .replace(/^[*\-#\s\d.]+/, '')
                  .trim()
          }

          return json(
            { answer, sources: [], discussionPoints: [], suggestedDiscussionQuestion: discussionQ },
            200,
            cors
          )
        } finally {
          releaseSemaphore()
        }
      }

      // ── /api/generate-policy-proposal ───────────────────────────────
      if (url.pathname === '/api/generate-policy-proposal') {
        const body = (await request.json()) as {
          agendaId: string
          deliberationSummary: string
          targetAudience: string
        }

        try {
          await acquireSemaphore()
        } catch {
          return waitingResponse(cors)
        }

        try {
          const prompt = `다음 주민 공론장 숙의 결과를 바탕으로 정책 제안안을 작성해 주세요.
의제: ${body.agendaId} / 제출 대상: ${body.targetAudience}
숙의 결과:\n${body.deliberationSummary}

JSON 형식으로만 응답하세요:
{"proposalTitle":"","problem":"","residentOpinions":"","coreProposal":"","implementation":"","expectedEffect":"","risksAndSupplements":"","presentationSentence":""}

쉬운 한국어로, 70대 주민도 이해할 수 있게 작성하세요.`
          const raw = await gemini(env, prompt, undefined, undefined, 3000)
          const match = raw.match(/\{[\s\S]*\}/)
          if (!match) throw new Error('응답 형식 오류')
          return json(JSON.parse(match[0]), 200, cors)
        } finally {
          releaseSemaphore()
        }
      }

      // ── /api/generate-presentation ──────────────────────────────────
      if (url.pathname === '/api/generate-presentation') {
        const body = (await request.json()) as {
          proposalText: string
          duration: string
          audience: string
        }

        try {
          await acquireSemaphore()
        } catch {
          return waitingResponse(cors)
        }

        try {
          const prompt = `다음 정책 제안안을 ${body.duration} ${body.audience} 발표문으로 변환해 주세요.
${body.proposalText}

JSON 형식으로만 응답하세요:
{"script":"전체 발표문(구어체)","keyMessages":["핵심문장1","핵심문장2","핵심문장3"]}

발표문 구조: 인사 → 우리 동네 문제 → 주민 의견 → 핵심 제안 → 기대 변화 → 마무리`
          const raw = await gemini(env, prompt, undefined, undefined, 2000)
          const match = raw.match(/\{[\s\S]*\}/)
          if (!match) throw new Error('응답 형식 오류')
          return json(JSON.parse(match[0]), 200, cors)
        } finally {
          releaseSemaphore()
        }
      }

      // ── /api/generate-slide-deck (Gemini → 슬라이드 구성안) ─────────
      if (url.pathname === '/api/generate-slide-deck') {
        const body = (await request.json()) as {
          agendaId: string
          proposalText: string
          presentationText: string
          slideCount: number
          aspectRatio: '16:9'
          style: string
        }

        try {
          await acquireSemaphore()
        } catch {
          return waitingResponse(cors)
        }

        try {
          const prompt = `다음 정책 제안안을 바탕으로 ${body.slideCount}장의 16:9 발표용 슬라이드 구성안을 만들어 주세요.
스타일: ${body.style}
정책 제안안:\n${body.proposalText}${body.presentationText ? `\n\n발표문:\n${body.presentationText}` : ''}

JSON 형식으로만 응답하세요:
{
  "deckTitle":"","subtitle":"",
  "slideCount":${body.slideCount},"aspectRatio":"16:9","style":"${body.style}",
  "slides":[{
    "slideNumber":1,"title":"슬라이드 제목","keyMessage":"핵심 메시지(한 문장)",
    "visualScene":"시각적 장면 설명","layoutGuide":"레이아웃 안내",
    "imagePrompt":"[ENGLISH ONLY] Detailed DALL-E 3 prompt for a 16:9 slide background image. Korean village community theme, no human faces, warm colors, professional presentation style."
  }]
}

imagePrompt 작성 규칙:
- 반드시 영어로 작성
- 슬라이드 배경으로 사용할 이미지 (사람 얼굴 없음)
- 한국 농촌·도시 마을공동체, 주민자치, 지역 협력 관련 이미지
- 밝고 따뜻한 색감, 전문적인 발표 자료 분위기
- 예: "A warm and vibrant illustration of a Korean village community gathering space..."`

          const raw = await gemini(env, prompt, undefined, undefined, 3000)
          const match = raw.match(/\{[\s\S]*\}/)
          if (!match) throw new Error('응답 형식 오류')
          return json(JSON.parse(match[0]), 200, cors)
        } finally {
          releaseSemaphore()
        }
      }

      // ── /api/generate-slide-image (DALL-E 3 → 단일 슬라이드 이미지) ─
      if (url.pathname === '/api/generate-slide-image') {
        if (!env.OPENAI_API_KEY) {
          return json(
            { message: 'OpenAI API 키가 설정되지 않았습니다.\n설정 방법: Cloudflare Workers Dashboard > Settings > Variables > OPENAI_API_KEY 추가' },
            500,
            cors
          )
        }

        const body = (await request.json()) as {
          slideNumber: number
          title: string
          imagePrompt: string
          style: string
        }

        try {
          await acquireSemaphore()
        } catch {
          return waitingResponse(cors)
        }

        try {
          // DALL-E 3 이미지 생성
          const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'dall-e-3',
              prompt: body.imagePrompt,
              n: 1,
              size: '1792x1024', // 16:9 근사치
              quality: 'standard', // standard: $0.04/장, hd: $0.08/장
              response_format: 'url',
            }),
          })

          if (!dalleRes.ok) {
            const err = (await dalleRes.json()) as { error?: { message?: string } }
            throw new Error(err.error?.message ?? `DALL-E 오류 (${dalleRes.status})`)
          }

          const dalleData = (await dalleRes.json()) as { data: Array<{ url: string }> }
          const imageUrl = dalleData.data[0].url

          // OpenAI URL → base64 변환 (브라우저 CORS 문제 우회)
          const imgRes = await fetch(imageUrl)
          if (!imgRes.ok) throw new Error('이미지 다운로드 실패')
          const ab = await imgRes.arrayBuffer()
          const base64 = arrayBufferToBase64(ab)

          return json(
            {
              slideNumber: body.slideNumber,
              title: body.title,
              imageBase64: `data:image/png;base64,${base64}`,
            },
            200,
            cors
          )
        } finally {
          releaseSemaphore()
        }
      }

      return json({ message: 'Not found' }, 404, cors)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '서버 오류가 발생했습니다.'
      return json({ message: msg }, 500, cors)
    }
  },
}
