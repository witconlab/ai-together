-- AI 투게더 정책 공론장 DB 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. 참여자 익명 의견 테이블
CREATE TABLE IF NOT EXISTS participant_opinions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id TEXT NOT NULL,                    -- 예: 'policy-01'
  anonymous_id TEXT NOT NULL,                 -- 예: 'P01-ANON-1842'
  nickname TEXT,                              -- 선택 입력 이름
  agree_content TEXT,                         -- 공감한 내용
  concern TEXT,                               -- 걱정되는 점
  improvement TEXT,                           -- 보완하면 좋을 점
  first_action TEXT,                          -- 먼저 실행하면 좋을 내용
  key_sentence TEXT,                          -- 발표에 넣고 싶은 한 문장
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 테이블 운영 세션 테이블 (퍼실리테이터/기록자용)
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id TEXT NOT NULL UNIQUE,             -- 정책별 1개 세션
  facilitator_name TEXT,                      -- 퍼실리테이터 이름
  recorder_name TEXT,                         -- 기록자 이름
  photo_url TEXT,                             -- 수기 정리판 사진 URL
  photo_uploaded_at TIMESTAMPTZ,
  ai_result JSONB,                            -- AI 분석 결과
  ai_processed_at TIMESTAMPTZ,
  final_content JSONB,                        -- 수정 확정된 최종 내용
  is_confirmed BOOLEAN DEFAULT FALSE,         -- 최종 확정 여부
  tiro_summary TEXT,                          -- TIRO 요약 텍스트
  tiro_url TEXT,                              -- TIRO 요약 링크
  pdf_url TEXT,                               -- 생성된 PDF URL
  pptx_url TEXT,                              -- 생성된 PPTX URL
  is_public TEXT DEFAULT 'private'            -- 'public' | 'private' | 'admin_only'
    CHECK (is_public IN ('public', 'private', 'admin_only')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER table_sessions_updated_at
  BEFORE UPDATE ON table_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. RLS (Row Level Security) 설정
ALTER TABLE participant_opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

-- 참여자 의견: 누구나 INSERT 가능, SELECT는 제한
CREATE POLICY "Anyone can submit opinion"
  ON participant_opinions FOR INSERT
  WITH CHECK (true);

-- 운영진은 모든 의견 조회 가능 (anon 키로도 읽기 허용 - 운영자 페이지에서 비밀번호로 제어)
CREATE POLICY "Anyone can read opinions"
  ON participant_opinions FOR SELECT
  USING (true);

-- table_sessions: 누구나 읽기/쓰기 (운영자 페이지에서 별도 비밀번호로 접근 제어)
CREATE POLICY "Anyone can read sessions"
  ON table_sessions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert sessions"
  ON table_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update sessions"
  ON table_sessions FOR UPDATE
  USING (true);

-- 5. Supabase Storage 버킷 생성 (사진 업로드용)
-- Storage > New Bucket > "policy-photos" > Public 체크
-- 아래는 SQL로는 안 되므로 대시보드에서 직접 생성하세요.

-- 6. 인덱스
CREATE INDEX IF NOT EXISTS idx_opinions_policy_id ON participant_opinions(policy_id);
CREATE INDEX IF NOT EXISTS idx_sessions_policy_id ON table_sessions(policy_id);

-- 7. 12개 정책 세션 초기 데이터 삽입
INSERT INTO table_sessions (policy_id) VALUES
  ('policy-01'), ('policy-02'), ('policy-03'), ('policy-04'),
  ('policy-05'), ('policy-06'), ('policy-07'), ('policy-08'),
  ('policy-09'), ('policy-10'), ('policy-11'), ('policy-12')
ON CONFLICT (policy_id) DO NOTHING;
