import { z } from "zod";

// =====================================================
// Step2 V2: 현실화된 지급구조 스키마
// =====================================================

// Escrow 스케줄 모드
export const EscrowScheduleModeSchema = z.enum(["lump_sum_end", "equal_annual", "custom"]);
export type EscrowScheduleMode = z.infer<typeof EscrowScheduleModeSchema>;

// Earnout 스케줄 모드
export const EarnoutScheduleModeSchema = z.enum(["equal_annual", "custom"]);
export type EarnoutScheduleMode = z.infer<typeof EarnoutScheduleModeSchema>;

// Escrow 스케줄 항목
export const EscrowScheduleItemSchema = z.object({
  year: z.number().int().min(1),
  pctOfTotal: z.number().min(0).max(100),
  probability: z.number().min(0).max(1).optional(), // custom 모드에서 연차별 확률
});
export type EscrowScheduleItem = z.infer<typeof EscrowScheduleItemSchema>;

// Earnout 스케줄 항목
export const EarnoutScheduleItemSchema = z.object({
  year: z.number().int().min(1),
  pctOfTotal: z.number().min(0).max(100),
  probability: z.number().min(0).max(1).default(0.6), // 조건부 달성확률
});
export type EarnoutScheduleItem = z.infer<typeof EarnoutScheduleItemSchema>;

// Step2 V2 입력 스키마
export const Step2V2InputSchema = z.object({
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
  
  // 지급 구조 기본 비율 (합계 100%)
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
  
  // Escrow 스케줄 설정
  escrowScheduleMode: EscrowScheduleModeSchema.default("lump_sum_end"),
  escrowSchedule: z.array(EscrowScheduleItemSchema).optional(),
  escrowProbability: z.number().min(0).max(1).default(0.9), // Escrow 전체 달성 확률
  
  // Earnout 스케줄 설정
  earnoutScheduleMode: EarnoutScheduleModeSchema.default("equal_annual"),
  earnoutSchedule: z.array(EarnoutScheduleItemSchema).optional(),
});

export type Step2V2Input = z.infer<typeof Step2V2InputSchema>;

// =====================================================
// 결과 타입
// =====================================================

// 케이스별 KPI
export interface CaseKPIs {
  immediateAmount: number;     // t=0 즉시 수령액
  finalAmount: number;         // t=lockInYears 수령액
  pvToTotalRatio: number;      // PV/총액 비율
}

// 케이스별 결과
export interface CaseResult {
  cashflows: number[];         // 연도별 현금흐름
  totalNominal: number;        // 명목 총액
  pv: number;                  // 현재가치
  kpis: CaseKPIs;
}

// 시나리오별 결과 (3가지 케이스 포함)
export interface ScenarioV2Result {
  equityPct: number;           // 지분율 (%)
  totalProceeds: number;       // 총 수령액 (100% 지급 시)
  cases: {
    guaranteed: CaseResult;    // 최악 케이스 (upfront만)
    expected: CaseResult;      // 기대 케이스 (확률 반영)
    best: CaseResult;          // 최선 케이스 (100% 달성)
  };
}

// Step2 V2 시뮬레이션 결과
export interface Step2V2Result {
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
  
  // 입력 에코 (전체)
  inputsEcho: Step2V2Input;
  
  // 시나리오별 결과
  scenarios: ScenarioV2Result[];
  
  // 경고
  warnings: string[];
  
  // 설명문
  explainText: string;
}

// API 응답
export interface Step2V2ApiResponse {
  success: boolean;
  data?: Step2V2Result;
  errors?: { field: string; message: string }[];
}

// =====================================================
// 스케줄 생성 헬퍼
// =====================================================

/**
 * Escrow 스케줄 기본값 생성
 */
export function generateDefaultEscrowSchedule(
  mode: EscrowScheduleMode,
  lockInYears: number,
  escrowPct: number,
  escrowProbability: number = 0.9
): EscrowScheduleItem[] {
  if (escrowPct === 0) return [];
  
  switch (mode) {
    case "lump_sum_end":
      return [{ year: lockInYears, pctOfTotal: escrowPct, probability: escrowProbability }];
    
    case "equal_annual":
      const annualPct = escrowPct / lockInYears;
      return Array.from({ length: lockInYears }, (_, i) => ({
        year: i + 1,
        pctOfTotal: annualPct,
        probability: escrowProbability,
      }));
    
    case "custom":
      // 커스텀은 사용자 입력 그대로 사용
      return [];
  }
}

/**
 * Earnout 스케줄 기본값 생성
 */
export function generateDefaultEarnoutSchedule(
  mode: EarnoutScheduleMode,
  lockInYears: number,
  earnoutPct: number,
  defaultProbability: number = 0.6
): EarnoutScheduleItem[] {
  if (earnoutPct === 0) return [];
  
  switch (mode) {
    case "equal_annual":
      const annualPct = earnoutPct / lockInYears;
      return Array.from({ length: lockInYears }, (_, i) => ({
        year: i + 1,
        pctOfTotal: annualPct,
        probability: defaultProbability,
      }));
    
    case "custom":
      // 커스텀은 사용자 입력 그대로 사용
      return [];
  }
}

/**
 * 스케줄 합계 검증
 */
export function validateScheduleSum(
  schedule: { pctOfTotal: number }[],
  expectedPct: number,
  tolerance: number = 0.01
): boolean {
  const sum = schedule.reduce((acc, item) => acc + item.pctOfTotal, 0);
  return Math.abs(sum - expectedPct) < tolerance;
}
