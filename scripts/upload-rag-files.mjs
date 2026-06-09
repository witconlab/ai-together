/**
 * Gemini File API 업로드 스크립트
 *
 * 사용법:
 *   node scripts/upload-rag-files.mjs <API_KEY> <폴더경로> [정책ID]
 *
 * 예시:
 *   node scripts/upload-rag-files.mjs AIzaSy... ./docs/community-space policy-05
 *   node scripts/upload-rag-files.mjs AIzaSy... ./docs/elderly-care policy-11
 *
 * 주의: 무료 Gemini File API는 48시간 후 파일이 자동 삭제됩니다.
 *       행사 전날 재업로드를 권장합니다.
 */

import { readFileSync, readdirSync } from 'fs'
import { join, extname } from 'path'

const API_KEY  = process.argv[2]
const FOLDER   = process.argv[3]
const POLICY_ID = process.argv[4] || '지정안함'

if (!API_KEY || !FOLDER) {
  console.log(`
사용법:
  node scripts/upload-rag-files.mjs <API_KEY> <폴더경로> [정책ID]

예시:
  node scripts/upload-rag-files.mjs AIzaSy... ./docs/community-space policy-05
  `)
  process.exit(1)
}

const MIME_MAP = {
  '.pdf':  'application/pdf',
  '.txt':  'text/plain',
  '.md':   'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

async function uploadFile(filePath, mimeType, displayName) {
  const fileData = readFileSync(filePath)

  // 1단계: 업로드 URL 발급
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol':             'resumable',
        'X-Goog-Upload-Command':              'start',
        'X-Goog-Upload-Header-Content-Length': String(fileData.length),
        'X-Goog-Upload-Header-Content-Type':   mimeType,
        'Content-Type':                        'application/json',
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  )

  if (!initRes.ok) {
    const err = await initRes.text()
    throw new Error(`업로드 초기화 실패: ${initRes.status} ${err}`)
  }

  const uploadUrl = initRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('업로드 URL을 받지 못했습니다')

  // 2단계: 파일 전송
  const uploadRes = await fetch(uploadUrl, {
    method:  'POST',
    headers: {
      'Content-Length':          String(fileData.length),
      'X-Goog-Upload-Offset':    '0',
      'X-Goog-Upload-Command':   'upload, finalize',
    },
    body: fileData,
  })

  if (!uploadRes.ok) {
    const err = await uploadRes.text()
    throw new Error(`파일 전송 실패: ${uploadRes.status} ${err}`)
  }

  return await uploadRes.json()
}

async function main() {
  let files
  try {
    files = readdirSync(FOLDER).filter(f => {
      const ext = extname(f).toLowerCase()
      return Object.keys(MIME_MAP).includes(ext)
    })
  } catch {
    console.error(`❌ 폴더를 찾을 수 없습니다: ${FOLDER}`)
    process.exit(1)
  }

  if (files.length === 0) {
    console.log(`⚠️  지원 파일 없음 (pdf, txt, md, docx)`)
    process.exit(0)
  }

  console.log(`\n📁 폴더: ${FOLDER}`)
  console.log(`📋 정책 ID: ${POLICY_ID}`)
  console.log(`📄 파일 수: ${files.length}개\n`)

  const results = []

  for (const file of files) {
    const filePath = join(FOLDER, file)
    const ext      = extname(file).toLowerCase()
    const mimeType = MIME_MAP[ext]

    process.stdout.write(`⬆️  ${file} ... `)

    try {
      const res = await uploadFile(filePath, mimeType, file)
      const uri = res.file?.uri ?? res.uri
      results.push({ uri, mimeType, displayName: file })
      console.log(`✅ ${uri}`)
    } catch (e) {
      console.log(`❌ 실패: ${e.message}`)
    }
  }

  if (results.length === 0) {
    console.log('\n❌ 업로드된 파일이 없습니다.')
    return
  }

  // worker/src/index.ts에 붙여넣을 코드 출력
  console.log('\n')
  console.log('═'.repeat(60))
  console.log('📋 worker/src/index.ts 의 FILE_REGISTRY에 아래를 복사하세요:')
  console.log('═'.repeat(60))
  console.log(`\n  '${POLICY_ID}': [`)
  for (const r of results) {
    console.log(`    { uri: '${r.uri}', mimeType: '${r.mimeType}', displayName: '${r.displayName}' },`)
  }
  console.log(`  ],\n`)
  console.log('═'.repeat(60))
  console.log('⚠️  파일은 48시간 후 자동 삭제됩니다. 행사 전날 재업로드 권장!')
}

main()
