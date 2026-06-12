/**
 * 12개 정책 RAG 파일 전체 일괄 업로드
 *
 * 사용법:
 *   node scripts/upload-all-rag-files.mjs <GEMINI_API_KEY>
 *
 * 예시:
 *   node scripts/upload-all-rag-files.mjs AIzaSyXXXXXXXXXXX
 *
 * 실행 전: rag-files/policy-XX_xxx/ 폴더에 PDF/TXT 파일을 넣어두세요.
 */

import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, extname } from 'path'

const API_KEY = process.argv[2]
if (!API_KEY) {
  console.log('사용법: node scripts/upload-all-rag-files.mjs <GEMINI_API_KEY>')
  process.exit(1)
}

const RAG_DIR = './rag-files'

// 폴더명 → policy ID 매핑
const POLICY_FOLDERS = [
  { folder: 'policy-01_읍면동장선출제',    id: 'policy-01' },
  { folder: 'policy-02_재정자립기반',       id: 'policy-02' },
  { folder: 'policy-03_통합형마을자치',     id: 'policy-03' },
  { folder: 'policy-04_통합조례',           id: 'policy-04' },
  { folder: 'policy-05_공유공간활용',       id: 'policy-05' },
  { folder: 'policy-06_통합지원기관',       id: 'policy-06' },
  { folder: 'policy-07_주민자치회성장단계', id: 'policy-07' },
  { folder: 'policy-08_주민자치회대표성',   id: 'policy-08' },
  { folder: 'policy-09_마을자치한마당',     id: 'policy-09' },
  { folder: 'policy-10_시민주권사관학교',   id: 'policy-10' },
  { folder: 'policy-11_도시농촌상생',       id: 'policy-11' },
  { folder: 'policy-12_마을활동가치',       id: 'policy-12' },
]

const MIME_MAP = {
  '.pdf':  'application/pdf',
  '.txt':  'text/plain',
  '.md':   'text/plain',
}

async function uploadFile(filePath, mimeType, displayName) {
  const fileData = readFileSync(filePath)

  // 업로드 URL 발급
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol':              'resumable',
        'X-Goog-Upload-Command':               'start',
        'X-Goog-Upload-Header-Content-Length': String(fileData.length),
        'X-Goog-Upload-Header-Content-Type':   mimeType,
        'Content-Type':                        'application/json',
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  )
  if (!initRes.ok) throw new Error(`초기화 실패: ${initRes.status} ${await initRes.text()}`)

  const uploadUrl = initRes.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('업로드 URL 없음')

  // 파일 전송
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length':        String(fileData.length),
      'X-Goog-Upload-Offset':  '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: fileData,
  })
  if (!uploadRes.ok) throw new Error(`전송 실패: ${uploadRes.status} ${await uploadRes.text()}`)

  const result = await uploadRes.json()
  return result.file ?? result
}

async function main() {
  console.log('\n🚀 12개 정책 RAG 파일 일괄 업로드 시작\n')

  const registry = {}
  let totalFiles = 0
  let totalSuccess = 0

  for (const { folder, id } of POLICY_FOLDERS) {
    const folderPath = join(RAG_DIR, folder)
    registry[id] = []

    if (!existsSync(folderPath)) {
      console.log(`⚠️  [${id}] 폴더 없음: ${folder}`)
      continue
    }

    const files = readdirSync(folderPath).filter(f => {
      const ext = extname(f).toLowerCase()
      return Object.keys(MIME_MAP).includes(ext) && !f.startsWith('.')
    })

    if (files.length === 0) {
      console.log(`📂 [${id}] 파일 없음 (건너뜀)`)
      continue
    }

    console.log(`\n📁 [${id}] ${files.length}개 파일`)

    for (const file of files) {
      const filePath = join(folderPath, file)
      const mimeType = MIME_MAP[extname(file).toLowerCase()]
      totalFiles++

      process.stdout.write(`   ⬆️  ${file} ... `)
      try {
        const res = await uploadFile(filePath, mimeType, file)
        const uri = res.uri
        registry[id].push({ uri, mimeType, displayName: file })
        console.log(`✅`)
        totalSuccess++
      } catch (e) {
        console.log(`❌ ${e.message}`)
      }
    }
  }

  // 결과 출력
  console.log('\n\n' + '═'.repeat(65))
  console.log('📋 worker/src/index.ts 의 FILE_REGISTRY를 아래로 교체하세요:')
  console.log('═'.repeat(65))
  console.log('\nconst FILE_REGISTRY: Record<string, FileRef[]> = {')
  for (const { id } of POLICY_FOLDERS) {
    const files = registry[id] ?? []
    if (files.length === 0) {
      console.log(`  '${id}': [],`)
    } else {
      console.log(`  '${id}': [`)
      for (const f of files) {
        console.log(`    { uri: '${f.uri}', mimeType: '${f.mimeType}', displayName: '${f.displayName}' },`)
      }
      console.log(`  ],`)
    }
  }
  console.log('}')
  console.log('\n' + '═'.repeat(65))
  console.log(`\n✅ 완료: ${totalSuccess}/${totalFiles}개 파일 업로드`)
  console.log('⚠️  48시간 후 자동 삭제 → 행사 전날 재실행 필요!\n')
}

main()
