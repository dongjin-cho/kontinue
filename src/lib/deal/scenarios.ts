/**
 * 딜 구조 시나리오 생성 및 계산 로직
 * 5개 시나리오: ALL_CASH_CONTROL, PARTIAL_EXIT_ROLLOVER, PERFORMANCE_EARNOUT, CASH_AND_STOCK, ASSET_DEAL
 */

// ========================
// Types
// ========================

export type ScenarioCode =
  | "ALL_CASH_CONTROL"
  | "PARTIAL_EXIT_ROLLOVER"
  | "PERFORMANCE_EARNOUT"
  | "CASH_AND_STOCK"
  | "ASSET_DEAL";

export type HopeToSell = "전량" | "일부";
export type EbitdaTrend = "상승" | "보합" | "변동";

export interface CapTable {
  founderShare: number; // 0~100
  investorShare: number; // 0~100
  optionPool: number; // 0~100
}

export interface DealScenarioInput {
  // Step1 결과
  equityValueLow: number;
  equityValueHigh: number;
  equityValueMedian?: number;

  // Cap Table
  capTable: CapTable;

  // 거래 전제 조건
  hopeToSell: HopeToSell;
  expectedExitDate?: string; // YYYY-MM
  secondaryRatio: number; // 0~100
  primaryIssue: boolean;

  // 보조 정보
  revenueGrowth: number; // %
  ebitdaTrend: EbitdaTrend;
  companyProfile: string;

  // 계산 기준
  escrowAssumption?: number; // 0~1
  earnoutProbability?: number; // 0~1
  feeRate?: number; // 0~1
  taxRate?: number; // 0~1 (옵션)
}

export interface ScenarioAssumptions {
  targetSaleRatio?: number;
  rolloverRatio?: number;
  basePaymentRatio?: number;
  earnoutRatio?: number;
  earnoutYears?: number;
  earnoutProbability?: number;
  cashRatio?: number;
  stockRatio?: number;
  stockLockupYears?: number;
  stockDiscount?: number;
  assetContributionRatio?: number;
  escrowRatio?: number;
}

export interface CashBreakdown {
  immediateCash: number;
  deferredCash: number;
  conditionalCashExpected: number;
  conditionalCashBest: number;
  stockValue: number;
  retainedValue: number;
  corporateCashIn?: number; // ASSET_DEAL용
}

export interface NetBreakdown {
  founderGross: number;
  founderFee: number;
  founderTax: number;
  founderNet: number;
  founderNetExpected: number; // 조건부 포함 기대값
}

export interface ScenarioResult {
  code: ScenarioCode;
  name: string;
  eligible: boolean;
  eligibilityReasons: string[];
  assumptions: ScenarioAssumptions;
  breakdown: CashBreakdown;
  netBreakdown: NetBreakdown;
  pros: string[];
  cons: string[];
  explanation: string;
  isFounderCashoutCalculable: boolean;
}

export interface ScenarioScores {
  cashNow: number;
  upside: number;
  risk: number;
  founderFit: number;
  total: number;
}

export interface ScoringResult {
  [key: string]: ScenarioScores;
}

export interface DealScenarioOutput {
  baseEquityMedian: number;
  inputsEcho: DealScenarioInput;
  scenarios: ScenarioResult[];
  top3: ScenarioCode[];
  scoring: ScoringResult;
  warnings: string[];
}

// ========================
// Constants
// ========================

const SCENARIO_NAMES: Record<ScenarioCode, string> = {
  ALL_CASH_CONTROL: "전액 현금 인수",
  PARTIAL_EXIT_ROLLOVER: "부분 매각 + 롤오버",
  PERFORMANCE_EARNOUT: "성과 연동 어닝아웃",
  CASH_AND_STOCK: "현금 + 주식 혼합",
  ASSET_DEAL: "자산 양수도",
};

// 기본 점수 매트릭스
const BASE_SCORES: Record<ScenarioCode, { cashNow: number; upside: number; risk: number }> = {
  ALL_CASH_CONTROL: { cashNow: 5, upside: 0, risk: 5 },
  PARTIAL_EXIT_ROLLOVER: { cashNow: 3, upside: 5, risk: 3 },
  PERFORMANCE_EARNOUT: { cashNow: 2, upside: 4, risk: 1 },
  CASH_AND_STOCK: { cashNow: 2, upside: 4, risk: 2 },
  ASSET_DEAL: { cashNow: 1, upside: 2, risk: 1 },
};

// ========================
// Eligibility Check
// ========================

function checkEligibility(
  code: ScenarioCode,
  input: DealScenarioInput
): { eligible: boolean; reasons: string[] } {
  const { capTable, hopeToSell, revenueGrowth, ebitdaTrend, companyProfile } = input;
  const founderShare = capTable.founderShare / 100;
  const reasons: string[] = [];

  switch (code) {
    case "ALL_CASH_CONTROL":
      if (hopeToSell === "전량" && founderShare >= 0.5) {
        reasons.push("전량 매각 희망 + 창업자 지분 50% 이상");
        return { eligible: true, reasons };
      }
      if (hopeToSell !== "전량") reasons.push("전량 매각 희망 필요");
      if (founderShare < 0.5) reasons.push("창업자 지분 50% 미만");
      return { eligible: false, reasons };

    case "PARTIAL_EXIT_ROLLOVER":
      if (hopeToSell === "일부" && founderShare >= 0.3 && revenueGrowth >= 10) {
        reasons.push("일부 매각 희망 + 창업자 지분 30% 이상 + 매출 성장률 10% 이상");
        return { eligible: true, reasons };
      }
      if (hopeToSell !== "일부") reasons.push("일부 매각 희망 필요");
      if (founderShare < 0.3) reasons.push("창업자 지분 30% 미만");
      if (revenueGrowth < 10) reasons.push("매출 성장률 10% 미만");
      return { eligible: false, reasons };

    case "PERFORMANCE_EARNOUT":
      if (revenueGrowth >= 15 && ebitdaTrend === "변동") {
        reasons.push("매출 성장률 15% 이상 + EBITDA 추이 변동");
        return { eligible: true, reasons };
      }
      if (revenueGrowth < 15) reasons.push("매출 성장률 15% 미만");
      if (ebitdaTrend !== "변동") reasons.push("EBITDA 추이가 변동이 아님");
      return { eligible: false, reasons };

    case "CASH_AND_STOCK":
      const hasSynergy = companyProfile.includes("시너지");
      if (hasSynergy || revenueGrowth >= 15) {
        if (hasSynergy) reasons.push("시너지 키워드 포함");
        if (revenueGrowth >= 15) reasons.push("매출 성장률 15% 이상");
        return { eligible: true, reasons };
      }
      reasons.push("시너지 키워드 없음");
      reasons.push("매출 성장률 15% 미만");
      return { eligible: false, reasons };

    case "ASSET_DEAL":
      const hasBizUnit = companyProfile.includes("사업부");
      if (hopeToSell !== "전량" && hasBizUnit) {
        reasons.push("전량 매각이 아님 + 사업부 키워드 포함");
        return { eligible: true, reasons };
      }
      if (hopeToSell === "전량") reasons.push("전량 매각 시 부적합");
      if (!hasBizUnit) reasons.push("사업부 키워드 없음");
      return { eligible: false, reasons };

    default:
      return { eligible: false, reasons: ["알 수 없는 시나리오"] };
  }
}

// ========================
// Scenario Calculations
// ========================

function calculateAllCashControl(
  equityMedian: number,
  input: DealScenarioInput
): { assumptions: ScenarioAssumptions; breakdown: CashBreakdown } {
  const founderShare = input.capTable.founderShare / 100;
  const escrowRatio = input.escrowAssumption || 0;

  const grossDealValue = equityMedian;
  const founderGross = grossDealValue * founderShare;
  const escrowAmount = founderGross * escrowRatio;

  return {
    assumptions: {
      targetSaleRatio: 1.0,
      escrowRatio,
    },
    breakdown: {
      immediateCash: founderGross - escrowAmount,
      deferredCash: escrowAmount, // 에스크로는 deferred로
      conditionalCashExpected: 0,
      conditionalCashBest: 0,
      stockValue: 0,
      retainedValue: 0,
    },
  };
}

function calculatePartialExitRollover(
  equityMedian: number,
  input: DealScenarioInput
): { assumptions: ScenarioAssumptions; breakdown: CashBreakdown } {
  const founderShare = input.capTable.founderShare / 100;
  const targetSaleRatio = 0.65;
  const rolloverRatio = 0.35;

  const grossDealValue = equityMedian * targetSaleRatio;
  const founderCashGross = grossDealValue * founderShare;
  const founderRetained = equityMedian * rolloverRatio * founderShare;

  return {
    assumptions: {
      targetSaleRatio,
      rolloverRatio,
    },
    breakdown: {
      immediateCash: founderCashGross,
      deferredCash: 0,
      conditionalCashExpected: 0,
      conditionalCashBest: 0,
      stockValue: 0,
      retainedValue: founderRetained,
    },
  };
}

function calculatePerformanceEarnout(
  equityMedian: number,
  input: DealScenarioInput
): { assumptions: ScenarioAssumptions; breakdown: CashBreakdown } {
  const founderShare = input.capTable.founderShare / 100;
  const basePaymentRatio = 0.75;
  const earnoutRatio = 0.25;
  const earnoutProbability = input.earnoutProbability || 0.5;
  const earnoutYears = 2;

  const guaranteedGross = equityMedian * basePaymentRatio * founderShare;
  const earnoutGrossMax = equityMedian * earnoutRatio * founderShare;
  const earnoutExpected = earnoutGrossMax * earnoutProbability;

  return {
    assumptions: {
      basePaymentRatio,
      earnoutRatio,
      earnoutYears,
      earnoutProbability,
    },
    breakdown: {
      immediateCash: guaranteedGross,
      deferredCash: 0,
      conditionalCashExpected: earnoutExpected,
      conditionalCashBest: earnoutGrossMax,
      stockValue: 0,
      retainedValue: 0,
    },
  };
}

function calculateCashAndStock(
  equityMedian: number,
  input: DealScenarioInput
): { assumptions: ScenarioAssumptions; breakdown: CashBreakdown } {
  const founderShare = input.capTable.founderShare / 100;
  const cashRatio = 0.6;
  const stockRatio = 0.4;
  const stockLockupYears = 1;
  const stockDiscount = 0.1;

  const cashImmediate = equityMedian * cashRatio * founderShare;
  const stockValue = equityMedian * stockRatio * founderShare * (1 - stockDiscount);

  return {
    assumptions: {
      cashRatio,
      stockRatio,
      stockLockupYears,
      stockDiscount,
    },
    breakdown: {
      immediateCash: cashImmediate,
      deferredCash: 0,
      conditionalCashExpected: 0,
      conditionalCashBest: 0,
      stockValue,
      retainedValue: 0,
    },
  };
}

function calculateAssetDeal(
  equityMedian: number,
  input: DealScenarioInput
): { assumptions: ScenarioAssumptions; breakdown: CashBreakdown } {
  const assetContributionRatio = 0.5;
  const corporateCashIn = equityMedian * assetContributionRatio;

  return {
    assumptions: {
      assetContributionRatio,
    },
    breakdown: {
      immediateCash: 0,
      deferredCash: 0,
      conditionalCashExpected: 0,
      conditionalCashBest: 0,
      stockValue: 0,
      retainedValue: 0,
      corporateCashIn,
    },
  };
}

// ========================
// Net Calculation
// ========================

function calculateNetBreakdown(
  breakdown: CashBreakdown,
  feeRate: number,
  taxRate: number,
  isCalculable: boolean
): NetBreakdown {
  if (!isCalculable) {
    return {
      founderGross: 0,
      founderFee: 0,
      founderTax: 0,
      founderNet: 0,
      founderNetExpected: 0,
    };
  }

  // 즉시 + 지연 현금 기준 Gross
  const cashGross = breakdown.immediateCash + breakdown.deferredCash;
  const founderFee = cashGross * feeRate;
  const afterFee = cashGross - founderFee;
  const founderTax = afterFee * taxRate;
  const founderNet = afterFee - founderTax;

  // 조건부 포함 기대값
  const conditionalAfterFee = breakdown.conditionalCashExpected * (1 - feeRate);
  const conditionalNet = conditionalAfterFee * (1 - taxRate);
  const founderNetExpected = founderNet + conditionalNet;

  return {
    founderGross: cashGross + breakdown.conditionalCashExpected,
    founderFee: founderFee + breakdown.conditionalCashExpected * feeRate,
    founderTax: founderTax + conditionalAfterFee * taxRate,
    founderNet,
    founderNetExpected,
  };
}

// ========================
// Pros/Cons/Explanation
// ========================

function getScenarioDetails(code: ScenarioCode): { pros: string[]; cons: string[] } {
  switch (code) {
    case "ALL_CASH_CONTROL":
      return {
        pros: [
          "거래 즉시 전액 현금 확보",
          "미래 리스크 없음",
          "구조가 단순하여 협상 용이",
        ],
        cons: [
          "미래 성장 업사이드 포기",
          "일반적으로 밸류에이션 프리미엄 낮음",
          "매각 후 경영 참여 불가",
        ],
      };
    case "PARTIAL_EXIT_ROLLOVER":
      return {
        pros: [
          "즉시 현금 + 미래 업사이드 동시 확보",
          "경영 지속 참여 가능",
          "인수자와 이해관계 정렬",
        ],
        cons: [
          "롤오버 지분 가치 불확실성",
          "경영 자율성 제한 가능",
          "2차 매각까지 추가 시간 필요",
        ],
      };
    case "PERFORMANCE_EARNOUT":
      return {
        pros: [
          "매수자와 가치 평가 갭 해소",
          "성과 달성 시 높은 총 대가",
          "거래 성사 가능성 높음",
        ],
        cons: [
          "실적 미달 시 대가 감소",
          "인수 후 경영 간섭 가능",
          "어닝아웃 조건 협상 복잡",
        ],
      };
    case "CASH_AND_STOCK":
      return {
        pros: [
          "인수자 주식 상승 시 추가 이익",
          "절세 효과 가능(주식 이연)",
          "전략적 파트너십 강화",
        ],
        cons: [
          "주식 가치 변동 리스크",
          "락업 기간 중 매각 불가",
          "비상장 주식은 유동성 낮음",
        ],
      };
    case "ASSET_DEAL":
      return {
        pros: [
          "특정 사업부만 분리 매각 가능",
          "기존 법인 유지 가능",
          "우발채무 분리 용이",
        ],
        cons: [
          "창업자 직접 현금 수령 불가",
          "배당/청산 등 2차 절차 필요",
          "세금 구조 복잡",
        ],
      };
    default:
      return { pros: [], cons: [] };
  }
}

function generateExplanation(
  code: ScenarioCode,
  eligible: boolean,
  input: DealScenarioInput
): string {
  const { hopeToSell, revenueGrowth, ebitdaTrend } = input;

  if (!eligible) {
    return `현재 조건에서는 ${SCENARIO_NAMES[code]} 구조가 적합하지 않습니다. 적합성 조건을 확인해주세요.`;
  }

  switch (code) {
    case "ALL_CASH_CONTROL":
      return `전량 매각을 희망하고 창업자 지분이 충분하여 전액 현금 인수 구조가 적합합니다. 거래 즉시 전액을 현금으로 수령하며, 미래 리스크 없이 깔끔한 엑싯이 가능합니다.`;

    case "PARTIAL_EXIT_ROLLOVER":
      return `일부 매각을 희망하고 성장세(${revenueGrowth}%)가 양호하여 부분 매각 후 롤오버 구조가 적합합니다. 즉시 현금을 확보하면서도 잔여 지분으로 미래 업사이드에 참여할 수 있습니다.`;

    case "PERFORMANCE_EARNOUT":
      return `높은 성장률(${revenueGrowth}%)과 변동적인 EBITDA 추이로 인해 매수자와 가치 평가 갭이 있을 수 있습니다. 어닝아웃 구조를 통해 성과 달성 시 추가 대가를 확보할 수 있습니다.`;

    case "CASH_AND_STOCK":
      return `시너지 효과 또는 높은 성장성으로 전략적 인수 가능성이 높습니다. 현금과 주식 혼합 구조를 통해 즉시 현금과 함께 인수자의 성장에 참여할 수 있습니다.`;

    case "ASSET_DEAL":
      return `특정 사업부 매각을 고려하는 경우 자산 양수도 구조가 적합합니다. 법인으로 현금이 유입되며, 창업자 수령은 배당/감자/청산 등 2차 절차가 필요합니다.`;

    default:
      return "";
  }
}

// ========================
// Scoring & Top 3
// ========================

function calculateScoring(
  scenarios: ScenarioResult[],
  input: DealScenarioInput
): ScoringResult {
  const { hopeToSell, revenueGrowth, ebitdaTrend } = input;
  const scoring: ScoringResult = {};

  for (const scenario of scenarios) {
    const base = BASE_SCORES[scenario.code];
    let founderFit = 0;

    // Founder Fit 가중치
    if (hopeToSell === "전량") {
      if (scenario.code === "ALL_CASH_CONTROL") founderFit += 2;
      if (scenario.code === "PARTIAL_EXIT_ROLLOVER") founderFit -= 1;
    }
    if (hopeToSell === "일부") {
      if (scenario.code === "PARTIAL_EXIT_ROLLOVER") founderFit += 2;
      if (scenario.code === "ALL_CASH_CONTROL") founderFit -= 1;
    }
    if (revenueGrowth >= 15) {
      if (scenario.code === "PARTIAL_EXIT_ROLLOVER") founderFit += 1;
      if (scenario.code === "PERFORMANCE_EARNOUT") founderFit += 1;
      if (scenario.code === "CASH_AND_STOCK") founderFit += 1;
    }
    if (ebitdaTrend === "변동") {
      if (scenario.code === "PERFORMANCE_EARNOUT") founderFit += 1;
    }

    // 적합하지 않은 시나리오는 점수 대폭 감소
    const eligibilityPenalty = scenario.eligible ? 0 : -10;

    const total = base.cashNow + base.upside + base.risk + founderFit + eligibilityPenalty;

    scoring[scenario.code] = {
      cashNow: base.cashNow,
      upside: base.upside,
      risk: base.risk,
      founderFit,
      total,
    };
  }

  return scoring;
}

function getTop3(scoring: ScoringResult): ScenarioCode[] {
  const sorted = Object.entries(scoring)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([code]) => code as ScenarioCode);

  return sorted;
}

// ========================
// Main Generator
// ========================

export function generateDealScenarios(input: DealScenarioInput): DealScenarioOutput {
  const warnings: string[] = [];

  // Cap Table 검증
  const capTableSum =
    input.capTable.founderShare + input.capTable.investorShare + input.capTable.optionPool;
  if (Math.abs(capTableSum - 100) > 0.01) {
    warnings.push(`Cap Table 합계가 100%가 아닙니다 (현재: ${capTableSum.toFixed(1)}%)`);
  }

  // Equity Median 계산
  const equityMedian =
    input.equityValueMedian || (input.equityValueLow + input.equityValueHigh) / 2;

  // 기본값 설정
  const feeRate = input.feeRate ?? 0.03;
  const taxRate = input.taxRate ?? 0;

  // 시나리오 생성
  const scenarioCodes: ScenarioCode[] = [
    "ALL_CASH_CONTROL",
    "PARTIAL_EXIT_ROLLOVER",
    "PERFORMANCE_EARNOUT",
    "CASH_AND_STOCK",
    "ASSET_DEAL",
  ];

  const scenarios: ScenarioResult[] = scenarioCodes.map((code) => {
    const { eligible, reasons } = checkEligibility(code, input);
    const { pros, cons } = getScenarioDetails(code);
    const explanation = generateExplanation(code, eligible, input);

    let assumptions: ScenarioAssumptions = {};
    let breakdown: CashBreakdown = {
      immediateCash: 0,
      deferredCash: 0,
      conditionalCashExpected: 0,
      conditionalCashBest: 0,
      stockValue: 0,
      retainedValue: 0,
    };

    const isFounderCashoutCalculable = code !== "ASSET_DEAL";

    // 계산
    switch (code) {
      case "ALL_CASH_CONTROL":
        ({ assumptions, breakdown } = calculateAllCashControl(equityMedian, input));
        break;
      case "PARTIAL_EXIT_ROLLOVER":
        ({ assumptions, breakdown } = calculatePartialExitRollover(equityMedian, input));
        break;
      case "PERFORMANCE_EARNOUT":
        ({ assumptions, breakdown } = calculatePerformanceEarnout(equityMedian, input));
        break;
      case "CASH_AND_STOCK":
        ({ assumptions, breakdown } = calculateCashAndStock(equityMedian, input));
        break;
      case "ASSET_DEAL":
        ({ assumptions, breakdown } = calculateAssetDeal(equityMedian, input));
        break;
    }

    const netBreakdown = calculateNetBreakdown(breakdown, feeRate, taxRate, isFounderCashoutCalculable);

    return {
      code,
      name: SCENARIO_NAMES[code],
      eligible,
      eligibilityReasons: reasons,
      assumptions,
      breakdown,
      netBreakdown,
      pros,
      cons,
      explanation,
      isFounderCashoutCalculable,
    };
  });

  // 점수 계산 및 Top 3
  const scoring = calculateScoring(scenarios, input);
  const top3 = getTop3(scoring);

  return {
    baseEquityMedian: equityMedian,
    inputsEcho: input,
    scenarios,
    top3,
    scoring,
    warnings,
  };
}

// ========================
// Utility Functions
// ========================

export function formatScenarioName(code: ScenarioCode): string {
  return SCENARIO_NAMES[code];
}

export function isTop3Scenario(code: ScenarioCode, top3: ScenarioCode[]): boolean {
  return top3.includes(code);
}

export function getScenarioRank(code: ScenarioCode, top3: ScenarioCode[]): number | null {
  const index = top3.indexOf(code);
  return index >= 0 ? index + 1 : null;
}
