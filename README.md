# AI Together 공론장 운영센터

> 기술을 더하고, 숙의를 나누며, 마을을 잇다

주민 공론장에서 의제를 학습하고, AI 숙의 보조 챗봇으로 토론을 준비하며, 최종 정책 제안안을 16:9 발표 슬라이드로 만드는 웹 기반 운영 시스템입니다.

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React + Vite + TypeScript + Tailwind CSS |
| 배포 | GitHub Pages |
| 백엔드 | Cloudflare Workers |
| AI | Google Gemini API |
| 데이터 | Google Forms + Google Sheets |

---

## 설치 및 실행

### 1. 의존성 설치

```bash
# 프론트엔드
npm install

# 백엔드 (worker 폴더)
cd worker && npm install
```

### 2. 환경변수 설정

```bash
# 프론트엔드
cp .env.example .env.local
# VITE_WORKER_URL 을 실제 Worker URL로 수정

# 백엔드
cp worker/.dev.vars.example worker/.dev.vars
# GEMINI_API_KEY 를 실제 키로 수정
```

### 3. 로컬 실행

```bash
# 프론트엔드 (터미널 1)
npm run dev

# 백엔드 Worker (터미널 2)
cd worker && npm run dev
```

---

## Gemini API Key 설정

1. [Google AI Studio](https://aistudio.google.com/apikey)에서 API 키 발급
2. 로컬: `worker/.dev.vars`에 `GEMINI_API_KEY=your_key` 추가
3. 배포: `cd worker && wrangler secret put GEMINI_API_KEY`

---

## 의제 자료 추가 방법

```
rag-files/
  walking-safety/    # 의제 ID와 동일한 폴더명
    intro.pdf
    cases.md
  youth-space/
    intro.pdf
```

PDF, TXT, MD 파일을 의제 폴더에 넣은 후:

```bash
GEMINI_API_KEY=xxx npx tsx scripts/index-files.ts
```

출력된 `fileSearchStoreName`을 `src/data/agendas.ts`의 해당 의제에 등록하세요.

---

## Google Forms/Sheets 연결

`src/data/agendas.ts`에서 각 의제의 `googleFormUrl`과 `googleSheetUrl`을 실제 URL로 교체하세요.

---

## GitHub Pages 배포

```bash
# package.json의 vite.config.ts base 경로를 저장소 이름으로 수정
# 예: base: '/ai-together/'

npm run build
npm run deploy
```

---

## Cloudflare Worker 배포

```bash
cd worker
npx wrangler deploy

# ALLOWED_ORIGIN을 실제 GitHub Pages URL로 설정
npx wrangler vars set ALLOWED_ORIGIN https://YOUR_USERNAME.github.io
npx wrangler secret put GEMINI_API_KEY
```

---

## AI 챗봇 운영 원칙

- **정답 제공자가 아닌 숙의 보조자**입니다.
- 자료에 없는 내용은 추측하지 않습니다.
- 찬성과 우려 관점을 함께 제시합니다.
- 답변 끝에 토론 질문을 1개 제안합니다.
- 결론을 대신 내리지 않습니다.

---

## Rate Limit & 비용 관리

| 설정 | 값 |
|------|-----|
| 챗봇 rate limit | sessionId 기준 5초에 1회 |
| 추천 질문 캐싱 | 10분 |
| 챗봇 모델 | gemini-1.5-flash (저비용) |
| 정책 제안/슬라이드 | gemini-1.5-pro (운영진 전용) |

---

## 행사 당일 운영 체크리스트

- [ ] rag-files 색인 완료 확인
- [ ] Google Forms 링크 테스트
- [ ] QR 코드 인쇄 (메인 페이지 URL)
- [ ] Worker 배포 상태 확인
- [ ] 챗봇 테스트 질문 3개 이상 시도
- [ ] 150명 동시 접속 대비 rate limit 설정 확인
- [ ] 실시간 웹 검색 비활성화 확인

---

## 최종 정책 제안안 → 슬라이드 생성 흐름

1. **운영진 대시보드** → Google Sheets 결과 확인
2. **최종 정책 제안 만들기** → 숙의 결과 붙여넣기 → 제안안 생성
3. **발표문 만들기** → 제안안 붙여넣기 → 발표문 생성
4. **슬라이드 이미지 만들기** → 제안안 + 발표문 붙여넣기 → 16:9 슬라이드 생성
5. 슬라이드별 이미지 프롬프트 복사 → 이미지 생성 AI에서 실제 이미지 제작
6. JSON/MD 다운로드 후 PPT 등에 활용
