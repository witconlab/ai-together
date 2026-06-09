/**
 * Cloudflare Worker – AI Together 공론장 운영센터 백엔드
 * Gemini API 호출, RAG 챗봇, 정책 제안 생성, 슬라이드 생성
 */

interface Env {
  GEMINI_API_KEY: string
  ALLOWED_ORIGIN: string
}

// sessionId 기준 rate limit (5초에 1회)
const rateLimitMap = new Map<string, number>()

function checkRateLimit(sessionId: string, windowMs = 5000): boolean {
  const now = Date.now()
  const last = rateLimitMap.get(sessionId)
  if (last && now - last < windowMs) return false
  rateLimitMap.set(sessionId, now)
  return true
}

function corsHeaders(origin: string, allowedOrigin: string) {
  const allowed =
    origin === allowedOrigin ||
    origin === 'http://localhost:5173' ||
    origin === 'http://localhost:4173'
      ? origin
      : allowedOrigin
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  })
}

async function gemini(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 2048, temperature: 0.3 },
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API 오류: ${res.status} ${err}`)
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// 챗봇 시스템 프롬프트
const CHATBOT_SYSTEM = `당신은 주민 공론장의 AI 숙의 보조자입니다.

핵심 원칙:
- 정답을 대신 내리지 않습니다. 주민이 스스로 판단하도록 돕습니다.
- 자료 기반으로 답변합니다. 자료에 없으면 "제공된 자료에서 확인되지 않습니다"라고 말합니다.
- 70대 어르신도 이해할 수 있는 쉬운 한국어로 답변합니다.
- 찬성 관점과 우려 관점을 함께 제시합니다.
- 행정이 확정한 것처럼 단정하지 않습니다.

답변 구조 (반드시 이 순서로):
1. **쉬운 요약** (2-3문장, 아주 쉬운 말로)
2. **자료에서 확인되는 내용**
3. **함께 생각해볼 쟁점** (찬성/우려 양쪽)
4. **기대 효과 또는 우려점**
5. **💬 함께 토론해볼 질문** (1개, 마을 주민들이 토론할 수 있는 질문)`

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)

    try {
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        const body = (await request.json()) as {
          agendaId: string
          message: string
          sessionId: string
        }

        if (!checkRateLimit(body.sessionId)) {
          return json({ message: '잠시 후 다시 시도해 주세요. (5초에 1회 제한)' }, 429, cors)
        }

        const prompt = `[의제: ${body.agendaId}]\n\n주민 질문: ${body.message}\n\n위 질문에 답변해 주세요.`
        const answer = await gemini(env.GEMINI_API_KEY, 'gemini-2.5-flash', prompt, CHATBOT_SYSTEM)

        // 토론 질문 추출: "💬 함께 토론해볼 질문" 헤더 다음 줄에서 추출
        const lines = answer.split('\n')
        const headerIdx = lines.findIndex((l) => l.includes('토론해볼 질문') || l.includes('💬'))
        let suggestedDiscussionQuestion = ''
        if (headerIdx !== -1) {
          // 헤더 바로 다음 비어있지 않은 줄이 실제 질문
          const nextLine = lines.slice(headerIdx + 1).find((l) => l.trim().length > 0)
          if (nextLine) {
            suggestedDiscussionQuestion = nextLine.replace(/^[*\-#\s\d.]+/, '').trim()
          } else {
            // 헤더 줄 자체에 질문이 포함된 경우
            suggestedDiscussionQuestion = lines[headerIdx]
              .replace(/^.*토론해볼\s*질문[*\s:：]*/g, '')
              .replace(/^[*\-#\s\d.]+/, '')
              .trim()
          }
        }

        return json(
          {
            answer,
            sources: [],
            discussionPoints: [],
            suggestedDiscussionQuestion,
          },
          200,
          cors
        )
      }

      if (url.pathname === '/api/generate-policy-proposal' && request.method === 'POST') {
        const body = (await request.json()) as {
          agendaId: string
          deliberationSummary: string
          targetAudience: string
        }

        const prompt = `다음 주민 공론장 숙의 결과를 바탕으로 정책 제안안을 작성해 주세요.

의제: ${body.agendaId}
제출 대상: ${body.targetAudience}
숙의 결과:
${body.deliberationSummary}

다음 JSON 형식으로 응답하세요:
{
  "proposalTitle": "제안 제목",
  "problem": "문제 상황 설명",
  "residentOpinions": "주민 의견 요약",
  "coreProposal": "핵심 제안 내용",
  "implementation": "실행 방법",
  "expectedEffect": "기대 효과",
  "risksAndSupplements": "우려점과 보완 방안",
  "presentationSentence": "주민총회 발표용 한 문장"
}

주의: 쉬운 한국어로, 70대 주민도 이해할 수 있게 작성하세요.`

        const raw = await gemini(env.GEMINI_API_KEY, 'gemini-2.5-flash', prompt)
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('응답 형식 오류')
        const result = JSON.parse(jsonMatch[0])
        return json(result, 200, cors)
      }

      if (url.pathname === '/api/generate-presentation' && request.method === 'POST') {
        const body = (await request.json()) as {
          proposalText: string
          duration: string
          audience: string
        }

        const prompt = `다음 정책 제안안을 ${body.duration} ${body.audience} 발표문으로 변환해 주세요.

${body.proposalText}

다음 JSON 형식으로 응답하세요:
{
  "script": "전체 발표문 (발표자가 그대로 읽을 수 있도록 자연스러운 구어체로)",
  "keyMessages": ["핵심 문장 1", "핵심 문장 2", "핵심 문장 3"]
}

발표문 구조: 인사 → 우리 동네 문제 → 주민 의견 → 핵심 제안 → 기대 변화 → 마무리
쉬운 한국어, ${body.duration} 분량에 맞게 작성하세요.`

        const raw = await gemini(env.GEMINI_API_KEY, 'gemini-2.5-flash', prompt)
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('응답 형식 오류')
        const result = JSON.parse(jsonMatch[0])
        return json(result, 200, cors)
      }

      if (url.pathname === '/api/generate-slide-deck' && request.method === 'POST') {
        const body = (await request.json()) as {
          agendaId: string
          proposalText: string
          presentationText: string
          slideCount: number
          aspectRatio: string
          style: string
        }

        const slideStructure = {
          6: ['표지', '문제 상황', '주민 의견과 핵심 제안', '기대 효과', '실행 방법', '마무리와 논의 질문'],
          7: ['표지', '문제 상황', '주민 의견 요약', '핵심 제안', '기대 효과', '실행 방법', '마무리와 논의 질문'],
          8: ['표지', '문제 상황', '주민 의견 요약', '핵심 제안', '기대 효과', '실행 방법', '함께 논의할 질문', '마무리'],
        }[body.slideCount] || []

        const prompt = `다음 정책 제안안을 ${body.slideCount}장 16:9 발표 슬라이드 구성으로 만들어 주세요.

스타일: ${body.style}
슬라이드 구성: ${slideStructure.join(' → ')}

정책 제안안:
${body.proposalText}

${body.presentationText ? `발표문:\n${body.presentationText}` : ''}

다음 JSON 형식으로 응답하세요:
{
  "deckTitle": "슬라이드 덱 제목",
  "slideCount": ${body.slideCount},
  "aspectRatio": "16:9",
  "style": "${body.style}",
  "slides": [
    {
      "slideNumber": 1,
      "title": "슬라이드 제목",
      "keyMessage": "핵심 메시지 (1-2문장, 큰 글씨로 표시될 내용)",
      "visualScene": "추천 이미지 장면 묘사",
      "layoutGuide": "화면 구성 설명 (예: 왼쪽 텍스트, 오른쪽 이미지)",
      "imagePrompt": "영어로 된 이미지 생성 프롬프트 (16:9, photorealistic, Korean community 포함)"
    }
  ]
}

원칙: 1슬라이드 1메시지, 큰 글씨, 고령층도 읽기 쉽게, 네이비와 청록색 포인트 컬러`

        const raw = await gemini(env.GEMINI_API_KEY, 'gemini-2.5-flash', prompt)
        const jsonMatch = raw.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('응답 형식 오류')
        const result = JSON.parse(jsonMatch[0])
        return json(result, 200, cors)
      }

      return json({ message: '존재하지 않는 API입니다.' }, 404, cors)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '서버 오류가 발생했습니다.'
      return json({ message: msg }, 500, cors)
    }
  },
}
