import { z } from "zod";
import type { IndustryGroup } from "./constants";

// 현재 연도
const currentYear = new Date().getFullYear();

// Step1 입력 스키마 (Zod)
export const Step1InputSchema = z.object({
  // 기본 정보
  industryCode: z.string().min(1, "산업분류를 선택해주세요"),
  industryGroup: z.enum(["제조업", "IT서비스", "SaaS/플랫폼", "유통/커머스", "헬스케어", "기타"]).optional(),
  foundedYear: z
    .number()
    .int()
    .min(1900, "설립연도가 올바르지 않습니다")
    .max(currentYear, "설립연도는 현재 연도보다 클 수 없습니다"),
  employeeBand: z.enum(["<10", "10~30", "30~100", "100+"]),
  
  // 재무 성과
  revenue: z.number().nonnegative("매출액은 0 이상이어야 합니다"),
  ebitda: z.number(), // 음수 가능 (적자)
  ebitdaType: z.enum(["EBITDA", "영업이익"]).default("EBITDA"),
  netIncome: z.number(), // 음수 가능 (적자)
  revenueGrowth: z
    .number()
    .min(-100, "성장률은 -100% 이상이어야 합니다")
    .max(300, "성장률은 300% 이하여야 합니다"),
  
  // 부채 및 현금
  totalDebt: z.number().nonnegative("총 차입금은 0 이상이어야 합니다"),
  cash: z.number().nonnegative("현금은 0 이상이어야 합니다"),
});

export type Step1Input = z.infer<typeof Step1InputSchema>;

// 멀티플 정보
export interface MultiplesInfo {
  industryLow: number;
  industryMedian: number;
  industryHigh: number;
  peerProxyMedian: number;
  dlom: number;
  weights: {
    industry: number;
    peer: number;
  };
  finalLow: number;
  finalMedian: number;
  finalHigh: number;
}

// 보정 정보
export interface AdjustmentsInfo {
  growthAdj: number;
  sizeAdj: number;
  ageAdj: number;
  totalAdj: number;
}

// 기업가치 범위
export interface ValueRange {
  low: number;
  high: number;
  mid?: number;
}

// Step1 평가 결과
export interface Step1Result {
  // 평가 방법
  valuationMethod: string;
  canEvaluate: boolean;
  fallbackReason?: string;
  
  // 입력 요약
  industryGroup: IndustryGroup;
  ksic: string;
  inputs: Step1Input;
  
  // 멀티플 정보
  multiples: MultiplesInfo;
  
  // 보정 정보
  adjustments: AdjustmentsInfo;
  
  // 기업가치
  enterpriseValue: {
    baseMid: number;
    afterAdjustmentsMid: number;
    rangeLow: number;
    rangeHigh: number;
  };
  
  // 순차입금
  netDebt: number;
  
  // 지분가치
  equityValue: ValueRange;
  
  // 경고 목록
  warnings: string[];
  
  // 설명문
  explainText: string;
}

// API 응답 형태
export interface Step1ApiResponse {
  success: boolean;
  data?: Step1Result;
  errors?: { field: string; message: string }[];
}

// 검증 경고 타입
export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning" | "error";
}
