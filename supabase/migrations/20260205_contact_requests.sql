-- Contact Requests Table
-- 전문가 상담 신청 연락처 저장

CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  message TEXT,
  step1_result JSONB,
  step2_result JSONB,
  deal_result JSONB,
  status TEXT DEFAULT 'pending', -- pending, contacted, completed, cancelled
  notes TEXT, -- 관리자 메모
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  contacted_at TIMESTAMPTZ -- 연락 완료 시점
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_contact_requests_created_at ON contact_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_requests_status ON contact_requests(status);
CREATE INDEX IF NOT EXISTS idx_contact_requests_email ON contact_requests(email);

-- RLS 활성화 (서비스 키로만 접근)
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;

-- 서비스 역할만 모든 작업 가능
CREATE POLICY "Service role has full access to contact_requests"
  ON contact_requests
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_contact_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contact_requests_updated_at ON contact_requests;
CREATE TRIGGER trigger_update_contact_requests_updated_at
  BEFORE UPDATE ON contact_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_requests_updated_at();

-- 코멘트
COMMENT ON TABLE contact_requests IS '전문가 상담 신청 연락처';
COMMENT ON COLUMN contact_requests.status IS 'pending: 대기, contacted: 연락완료, completed: 상담완료, cancelled: 취소';
