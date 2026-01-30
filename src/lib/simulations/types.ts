import { z } from "zod";

// Step2 입력 스키마
export const Step2InputSchema = z.object({
  // 기준 지분가치 (Step1에서 선택된 값)
  equityBasisValue: z.number().positive("기준 지분가치는 0보다 커야 합니다"),
  
  // 기준 가격 선택
  valuationBasis: z.enum(["low", "mid", "high"]).default("mid"),
  
  // Lock-in 기간
  lockInYears: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  
  // 지분 시나리오 (1~10개, 각 1~100)
  equityScenarios: z
    .array(z.number().int().min(1).max(100))
    .min(1, "최소 1개의 시나리오가 필요합니다")
    .max(10, "최대 10개의 시나리오까지 가능합니다"),
  
  // 지급 구조 (합계 100%)
  payout: z.object({
    upfrontPct: z.number().min(0).max(100),
    escrowPct: z.number().min(0).max(100),
    earnoutPct: z.number().min(0).max(100),
  }).refine(
    (data) => Math.abs(data.upfrontPct + data.escrowPct + data.earnoutPct - 100) < 0.01,
    { message: "지급 구조의 합계가 100%여야 합니다" }
  ),
  
  // 할인율 (8% ~ 20%)
  discountRate: z.number().min(0.08).max(0.20),
});

export type Step2Input = z.infer<typeof Step2InputSchema>;

// KPI 정보
export interface ScenarioKPIs {
  immediateAmount: number;     // t=0 즉시 수령액
  finalAmount: number;         // t=lockInYears 수령액
  pvToTotalRatio: number;      // PV/총액 비율
}

// 시나리오별 결과
export interface ScenarioResult {
  equityPct: number;           // 지분율 (%)
  totalProceeds: number;       // 총 수령액
  pv: number;                  // 현재가치
  cashflows: number[];         // 연도별 현금흐름 [t=0, t=1, ..., t=lockInYears]
  kpis: ScenarioKPIs;
}

// Step2 시뮬레이션 결과
export interface Step2Result {
  // 입력 요약
  basis: {
    equityBasisValue: number;
    valuationBasis: "low" | "mid" | "high";
    lockInYears: number;
    discountRate: number;
    payout: {
      upfrontPct: number;
      escrowPct: number;
      earnoutPct: number;
    };
  };
  
  // 시나리오별 결과
  scenarios: ScenarioResult[];
  
  // 경고
  warnings: string[];
  
  // 설명문
  explainText: string;
}

// API 응답
export interface Step2ApiResponse {
  success: boolean;
  data?: Step2Result;
  errors?: { field: string; message: string }[];
}
