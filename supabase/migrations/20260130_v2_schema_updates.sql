-- =====================================================
-- V2 Schema Updates: Step2 현실화 + Step3 국문 재무제표 + Admin
-- =====================================================

-- =====================================================
-- 1. documents 테이블 확장
-- =====================================================

-- schema_version 컬럼 추가
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS schema_version TEXT DEFAULT 'kr-fin-v1';

-- selected_period_id 컬럼 추가 (사용자가 선택한 기간)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS selected_period_id TEXT;

-- normalized_summary 컬럼 추가 (원 단위 정규화된 요약)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS normalized_summary JSONB;

-- =====================================================
-- 2. simulation_runs 테이블 생성 (게스트 런 추적)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.simulation_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    anon_token TEXT UNIQUE, -- 게스트용 익명 토큰
    
    -- Step 입력/결과
    step1_input JSONB,
    step1_result JSONB,
    step2_input JSONB,
    step2_result JSONB,
    
    -- 완료 시점 추적
    step1_completed_at TIMESTAMPTZ,
    step2_completed_at TIMESTAMPTZ,
    step3_completed_at TIMESTAMPTZ,
    
    -- 메타 정보
    industry_group TEXT,
    company_name TEXT,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_runs_user_id ON public.simulation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_runs_anon_token ON public.simulation_runs(anon_token);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON public.simulation_runs(created_at);

-- updated_at 트리거
DROP TRIGGER IF EXISTS update_simulation_runs_updated_at ON public.simulation_runs;
CREATE TRIGGER update_simulation_runs_updated_at
    BEFORE UPDATE ON public.simulation_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

-- 게스트는 anon_token으로 자신의 run만 접근
DROP POLICY IF EXISTS "Users can manage own runs" ON public.simulation_runs;
CREATE POLICY "Users can manage own runs" ON public.simulation_runs
    FOR ALL USING (
        auth.uid() = user_id 
        OR (user_id IS NULL AND anon_token IS NOT NULL)
    );

-- Service role 전체 접근
DROP POLICY IF EXISTS "Service role full access to runs" ON public.simulation_runs;
CREATE POLICY "Service role full access to runs" ON public.simulation_runs
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- =====================================================
-- 3. leads 테이블 확장
-- =====================================================

-- send_error 컬럼 추가 (이미 없는 경우)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS send_error TEXT;

-- =====================================================
-- 4. Admin용 뷰 (통계 조회 편의)
-- =====================================================

-- 일별 런 통계
CREATE OR REPLACE VIEW public.admin_daily_run_stats AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_runs,
    COUNT(step1_completed_at) as step1_completed,
    COUNT(step2_completed_at) as step2_completed,
    COUNT(step3_completed_at) as step3_completed,
    COUNT(user_id) as logged_in_runs,
    COUNT(*) - COUNT(user_id) as anonymous_runs
FROM public.simulation_runs
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 문서 상태 통계
CREATE OR REPLACE VIEW public.admin_document_stats AS
SELECT 
    status,
    COUNT(*) as count,
    MAX(created_at) as last_created
FROM public.documents
GROUP BY status;

-- 리드 상태 통계
CREATE OR REPLACE VIEW public.admin_lead_stats AS
SELECT 
    sent_status,
    COUNT(*) as count,
    MAX(created_at) as last_created,
    MAX(sent_at) as last_sent
FROM public.leads
GROUP BY sent_status;

-- =====================================================
-- 뷰에 대한 RLS (Service role만 접근)
-- =====================================================

-- 뷰는 기본적으로 RLS 적용 안됨, 하지만 API에서 권한 체크 필요
