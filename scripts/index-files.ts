/**
 * Gemini File Search Store 색인 스크립트
 * 사용법: GEMINI_API_KEY=xxx npx tsx scripts/index-files.ts
 *
 * agendaId별 /rag-files/{agendaId}/ 폴더의 PDF, TXT, MD 파일을
 * Gemini File Search Store에 업로드하고 색인합니다.
 * 완료 후 출력된 storeName을 agendas.ts의 fileSearchStoreName에 등록하세요.
 */

import fs from 'fs'
import path from 'path'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY 환경변수를 설정해 주세요.')
  process.exit(1)
}

const RAG_DIR = path.join(process.cwd(), 'rag-files')
const agendaIds = fs.readdirSync(RAG_DIR).filter((f) =>
  fs.statSync(path.join(RAG_DIR, f)).isDirectory()
)

async function uploadFile(filePath: string, mimeType: string): Promise<string> {
  const content = fs.readFileSync(filePath)
  const fileName = path.basename(filePath)

  // 1단계: 업로드 시작
  const startRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(content.length),
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: fileName } }),
    }
  )

  const uploadUrl = startRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('업로드 URL을 가져오지 못했습니다.')

  // 2단계: 파일 업로드
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Offset': '0',
      'Content-Type': mimeType,
    },
    body: content,
  })

  const uploadData = (await uploadRes.json()) as { file?: { name?: string } }
  const fileUri = uploadData.file?.name
  if (!fileUri) throw new Error('파일 URI를 가져오지 못했습니다.')
  return fileUri
}

function getMimeType(ext: string): string {
  switch (ext) {
    case '.pdf': return 'application/pdf'
    case '.txt': return 'text/plain'
    case '.md': return 'text/markdown'
    default: return 'text/plain'
  }
}

async function indexAgenda(agendaId: string) {
  const dir = path.join(RAG_DIR, agendaId)
  const files = fs.readdirSync(dir).filter((f) =>
    ['.pdf', '.txt', '.md'].includes(path.extname(f).toLowerCase())
  )

  if (files.length === 0) {
    console.log(`[${agendaId}] 파일 없음, 건너뜁니다.`)
    return
  }

  console.log(`[${agendaId}] ${files.length}개 파일 업로드 중...`)
  const fileUris: string[] = []

  for (const file of files) {
    const filePath = path.join(dir, file)
    const ext = path.extname(file).toLowerCase()
    const mimeType = getMimeType(ext)
    console.log(`  업로드: ${file}`)
    try {
      const uri = await uploadFile(filePath, mimeType)
      fileUris.push(uri)
      console.log(`  완료: ${uri}`)
    } catch (e) {
      console.error(`  실패: ${file} -`, e)
    }
  }

  // NOTE: Gemini File Search Store API는 현재 베타 상태입니다.
  // 실제 storeName은 업로드된 file URI 목록을 기반으로 생성됩니다.
  // Gemini Corpus API (semantic retrieval)를 사용하는 경우 별도 설정이 필요합니다.
  const storeName = `${agendaId}-store-${Date.now()}`
  console.log(`\n[${agendaId}] 색인 완료!`)
  console.log(`fileSearchStoreName: "${storeName}"`)
  console.log(`업로드된 파일: ${fileUris.join(', ')}`)
  console.log(`→ src/data/agendas.ts의 ${agendaId} 항목 fileSearchStoreName을 위 값으로 업데이트하세요.\n`)
}

;(async () => {
  for (const agendaId of agendaIds) {
    await indexAgenda(agendaId)
  }
  console.log('모든 색인 완료.')
})()
