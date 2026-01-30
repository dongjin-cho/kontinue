-- =====================================================
-- Deal Scenarios 컬럼 추가
-- =====================================================

-- simulation_runs에 deal_scenarios 관련 컬럼 추가
ALTER TABLE public.simulation_runs 
ADD COLUMN IF NOT EXISTS deal_scenarios_input JSONB;

ALTER TABLE public.simulation_runs 
ADD COLUMN IF NOT EXISTS deal_scenarios_result JSONB;

ALTER TABLE public.simulation_runs 
ADD COLUMN IF NOT EXISTS deal_scenarios_completed_at TIMESTAMPTZ;

-- 인덱스 추가 (시나리오 분석용)
CREATE INDEX IF NOT EXISTS idx_runs_deal_scenarios 
ON public.simulation_runs(deal_scenarios_completed_at) 
WHERE deal_scenarios_completed_at IS NOT NULL;

-- View: Admin용 시나리오 통계
CREATE OR REPLACE VIEW admin_scenario_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE deal_scenarios_completed_at IS NOT NULL) as scenarios_generated,
  COUNT(*) FILTER (WHERE deal_scenarios_result->>'top3' IS NOT NULL) as with_recommendations
FROM public.simulation_runs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Comment
COMMENT ON COLUMN public.simulation_runs.deal_scenarios_input IS 'Deal scenarios input (cap table, preferences, etc.)';
COMMENT ON COLUMN public.simulation_runs.deal_scenarios_result IS 'Deal scenarios output (5 scenarios, top3, scoring)';
COMMENT ON COLUMN public.simulation_runs.deal_scenarios_completed_at IS 'When deal scenarios were generated';
