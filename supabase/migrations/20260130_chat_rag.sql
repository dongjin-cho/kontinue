-- =====================================================
-- Chat RAG: 벡터 검색 기반 챗봇
-- =====================================================

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 지식 베이스 문서 테이블
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,  -- 'ebitda', 'multiple', 'deal_structure', 'tax', 'general' 등
  embedding vector(1536),  -- OpenAI text-embedding-3-small 차원
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  anon_token TEXT,
  simulation_run_id UUID REFERENCES simulation_runs(id),
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB,  -- 참조된 문서 ID들
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 벡터 유사도 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 카테고리 인덱스
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_documents(category);

-- 세션 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_anon ON chat_sessions(anon_token);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- RLS 정책
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- knowledge_documents: 모든 사용자 읽기 가능
CREATE POLICY "Knowledge documents are viewable by everyone" ON knowledge_documents
  FOR SELECT USING (true);

-- chat_sessions: 본인 세션만 접근
CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (
    auth.uid() = user_id OR 
    anon_token = current_setting('app.anon_token', true)
  );

CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    user_id IS NULL
  );

-- chat_messages: 본인 세션의 메시지만 접근
CREATE POLICY "Users can view messages in own sessions" ON chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE user_id = auth.uid() OR anon_token = current_setting('app.anon_token', true)
    )
  );

CREATE POLICY "Users can insert messages in own sessions" ON chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE user_id = auth.uid() OR anon_token = current_setting('app.anon_token', true)
    )
  );

-- 벡터 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kd.id,
    kd.title,
    kd.content,
    kd.category,
    1 - (kd.embedding <=> query_embedding) AS similarity
  FROM knowledge_documents kd
  WHERE 1 - (kd.embedding <=> query_embedding) > match_threshold
  ORDER BY kd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 코멘트
COMMENT ON TABLE knowledge_documents IS 'M&A/기업가치 관련 지식 베이스';
COMMENT ON TABLE chat_sessions IS '챗봇 대화 세션';
COMMENT ON TABLE chat_messages IS '챗봇 대화 메시지';
COMMENT ON FUNCTION match_documents IS '벡터 유사도 기반 문서 검색';
