/**
 * Step2 V2 시뮬레이션 로직
 * 현실화된 지급구조: escrow 분할, earnout 연차별/조건부, Guaranteed/Expected/Best 케이스
 */

import type {
  Step2V2Input,
  Step2V2Result,
  ScenarioV2Result,
  CaseResult,
  CaseKPIs,
  EscrowScheduleItem,
  EarnoutScheduleItem,
} from "./types_v2";
import {
  generateDefaultEscrowSchedule,
  generateDefaultEarnoutSchedule,
  validateScheduleSum,
} from "./types_v2";

/**
 * 현재가치(PV) 계산
 * PV = Σ_{t=0..N} cashflows[t] / (1+r)^t
 */
export function calculatePV(cashflows: number[], discountRate: number): number {
  return cashflows.reduce((pv, cf, t) => {
    return pv + cf / Math.pow(1 + discountRate, t);
  }, 0);
}

/**
 * KPI 계산
 */
function calculateKPIs(
  cashflows: number[],
  totalNominal: number,
  pv: number,
  lockInYears: number
): CaseKPIs {
  return {
    immediateAmount: cashflows[0] || 0,
    finalAmount: cashflows[lockInYears] || 0,
    pvToTotalRatio: totalNominal > 0 ? pv / totalNominal : 0,
  };
}

/**
 * 케이스별 현금흐름 생성
 */
interface CashflowParams {
  totalProceeds: number;
  lockInYears: number;
  upfrontPct: number;
  escrowSchedule: EscrowScheduleItem[];
  earnoutSchedule: EarnoutScheduleItem[];
  caseType: "guaranteed" | "expected" | "best";
}

function generateCashflowsForCase(params: CashflowParams): number[] {
  const {
    totalProceeds,
    lockInYears,
    upfrontPct,
    escrowSchedule,
    earnoutSchedule,
    caseType,
  } = params;

  // 초기화: t=0..lockInYears
  const cashflows: number[] = new Array(lockInYears + 1).fill(0);

  // t=0: upfront (항상 100% 확정)
  const upfrontAmount = totalProceeds * (upfrontPct / 100);
  cashflows[0] = upfrontAmount;

  // Guaranteed 케이스: upfront만
  if (caseType === "guaranteed") {
    return cashflows;
  }

  // Escrow 처리
  for (const item of escrowSchedule) {
    if (item.year > 0 && item.year <= lockInYears) {
      const baseAmount = totalProceeds * (item.pctOfTotal / 100);
      let amount = baseAmount;

      if (caseType === "expected") {
        // Expected: 확률 반영
        const prob = item.probability ?? 0.9;
        amount = baseAmount * prob;
      }
      // Best: 100%

      cashflows[item.year] += amount;
    }
  }

  // Earnout 처리
  for (const item of earnoutSchedule) {
    if (item.year > 0 && item.year <= lockInYears) {
      const baseAmount = totalProceeds * (item.pctOfTotal / 100);
      let amount = baseAmount;

      if (caseType === "expected") {
        // Expected: 확률 반영
        const prob = item.probability ?? 0.6;
        amount = baseAmount * prob;
      }
      // Best: 100%

      cashflows[item.year] += amount;
    }
  }

  return cashflows;
}

/**
 * 단일 케이스 결과 계산
 */
function calculateCaseResult(
  cashflows: number[],
  discountRate: number,
  lockInYears: number
): CaseResult {
  const totalNominal = cashflows.reduce((sum, cf) => sum + cf, 0);
  const pv = calculatePV(cashflows, discountRate);
  const kpis = calculateKPIs(cashflows, totalNominal, pv, lockInYears);

  return {
    cashflows: cashflows.map((cf) => Math.round(cf)),
    totalNominal: Math.round(totalNominal),
    pv: Math.round(pv),
    kpis: {
      immediateAmount: Math.round(kpis.immediateAmount),
      finalAmount: Math.round(kpis.finalAmount),
      pvToTotalRatio: Math.round(kpis.pvToTotalRatio * 1000) / 1000,
    },
  };
}

/**
 * 설명문 생성
 */
function generateExplainText(
  input: Step2V2Input,
  scenarios: ScenarioV2Result[]
): string {
  const parts: string[] = [];

  // 1. 기본 설명
  parts.push(
    `락인 기간 ${input.lockInYears}년, 할인율 ${(input.discountRate * 100).toFixed(0)}%를 적용하여 시뮬레이션하였습니다.`
  );

  // 2. 지급 구조 설명
  const { upfrontPct, escrowPct, earnoutPct } = input.payout;
  parts.push(
    `지급 구조는 즉시 지급 ${upfrontPct}%, Escrow ${escrowPct}%, Earn-out ${earnoutPct}%입니다.`
  );

  // 3. 케이스 설명
  parts.push(
    `세 가지 케이스를 제공합니다: Guaranteed(확정, 즉시지급만), Expected(확률 반영), Best(100% 달성 가정).`
  );

  // 4. Escrow/Earnout 조건부 설명
  if (escrowPct > 0 || earnoutPct > 0) {
    const escrowProb = (input.escrowProbability * 100).toFixed(0);
    parts.push(
      `Escrow는 ${escrowProb}% 달성 확률을 가정하였고, Earn-out은 연차별 조건 달성 확률(기본 60%)을 적용하였습니다.`
    );
  }

  // 5. PV 영향
  const firstScenario = scenarios[0];
  if (firstScenario) {
    const expectedPvRatio = firstScenario.cases.expected.kpis.pvToTotalRatio;
    const guaranteedPvRatio = firstScenario.cases.guaranteed.kpis.pvToTotalRatio;
    
    if (expectedPvRatio < 1) {
      parts.push(
        `Expected 케이스 기준, 락인 기간과 할인율로 인해 현재가치는 명목 총액의 약 ${(expectedPvRatio * 100).toFixed(1)}%입니다.`
      );
    }
    
    if (guaranteedPvRatio < expectedPvRatio) {
      parts.push(
        `최악의 경우(Guaranteed), 즉시 지급분만 수령하게 되어 현재가치가 크게 감소합니다.`
      );
    }
  }

  // 6. 리스크 경고
  if (escrowPct + earnoutPct > 50) {
    parts.push(
      `Escrow와 Earn-out 비중이 높아 후행 지급에 따른 불확실성이 있습니다. 조건 달성 여부에 따라 실제 수령액이 달라질 수 있습니다.`
    );
  }

  return parts.join(" ");
}

/**
 * 입력 검증 및 스케줄 정규화
 */
interface NormalizedSchedules {
  escrowSchedule: EscrowScheduleItem[];
  earnoutSchedule: EarnoutScheduleItem[];
  warnings: string[];
}

function normalizeSchedules(input: Step2V2Input): NormalizedSchedules {
  const warnings: string[] = [];
  const { lockInYears, payout, escrowScheduleMode, earnoutScheduleMode } = input;

  // Escrow 스케줄
  let escrowSchedule: EscrowScheduleItem[];
  if (escrowScheduleMode === "custom" && input.escrowSchedule) {
    escrowSchedule = input.escrowSchedule;
    // 합계 검증
    if (!validateScheduleSum(escrowSchedule, payout.escrowPct)) {
      warnings.push(
        `Escrow 스케줄 합계(${escrowSchedule.reduce((s, i) => s + i.pctOfTotal, 0).toFixed(1)}%)가 ` +
        `설정된 비율(${payout.escrowPct}%)과 다릅니다.`
      );
    }
  } else {
    escrowSchedule = generateDefaultEscrowSchedule(
      escrowScheduleMode,
      lockInYears,
      payout.escrowPct,
      input.escrowProbability
    );
  }

  // Earnout 스케줄
  let earnoutSchedule: EarnoutScheduleItem[];
  if (earnoutScheduleMode === "custom" && input.earnoutSchedule) {
    earnoutSchedule = input.earnoutSchedule;
    // 합계 검증
    if (!validateScheduleSum(earnoutSchedule, payout.earnoutPct)) {
      warnings.push(
        `Earn-out 스케줄 합계(${earnoutSchedule.reduce((s, i) => s + i.pctOfTotal, 0).toFixed(1)}%)가 ` +
        `설정된 비율(${payout.earnoutPct}%)과 다릅니다.`
      );
    }
  } else {
    earnoutSchedule = generateDefaultEarnoutSchedule(
      earnoutScheduleMode,
      lockInYears,
      payout.earnoutPct
    );
  }

  return { escrowSchedule, earnoutSchedule, warnings };
}

/**
 * Step2 V2 시뮬레이션 실행
 */
export function simulateStep2V2(input: Step2V2Input): Step2V2Result {
  const warnings: string[] = [];

  // 스케줄 정규화
  const { escrowSchedule, earnoutSchedule, warnings: scheduleWarnings } =
    normalizeSchedules(input);
  warnings.push(...scheduleWarnings);

  // 지분 시나리오 중복 체크
  const uniqueScenarios = new Set(input.equityScenarios);
  if (uniqueScenarios.size !== input.equityScenarios.length) {
    warnings.push("중복된 지분 시나리오가 있습니다.");
  }

  // 시나리오별 계산
  const scenarios: ScenarioV2Result[] = input.equityScenarios.map((equityPct) => {
    const totalProceeds = input.equityBasisValue * (equityPct / 100);

    const baseParams = {
      totalProceeds,
      lockInYears: input.lockInYears,
      upfrontPct: input.payout.upfrontPct,
      escrowSchedule,
      earnoutSchedule,
    };

    // 3가지 케이스 계산
    const guaranteedCashflows = generateCashflowsForCase({
      ...baseParams,
      caseType: "guaranteed",
    });
    const expectedCashflows = generateCashflowsForCase({
      ...baseParams,
      caseType: "expected",
    });
    const bestCashflows = generateCashflowsForCase({
      ...baseParams,
      caseType: "best",
    });

    const guaranteed = calculateCaseResult(
      guaranteedCashflows,
      input.discountRate,
      input.lockInYears
    );
    const expected = calculateCaseResult(
      expectedCashflows,
      input.discountRate,
      input.lockInYears
    );
    const best = calculateCaseResult(
      bestCashflows,
      input.discountRate,
      input.lockInYears
    );

    // 일관성 검증: guaranteed <= expected <= best
    if (guaranteed.pv > expected.pv || expected.pv > best.pv) {
      warnings.push(
        `지분 ${equityPct}% 시나리오에서 케이스 간 PV 순서가 비정상입니다.`
      );
    }

    return {
      equityPct,
      totalProceeds: Math.round(totalProceeds),
      cases: { guaranteed, expected, best },
    };
  });

  // 추가 경고
  if (input.discountRate > 0.15) {
    warnings.push("할인율이 15%를 초과하여 현재가치가 크게 감소합니다.");
  }

  if (input.payout.upfrontPct < 30) {
    warnings.push("즉시 지급 비율이 30% 미만으로 유동성 위험이 있을 수 있습니다.");
  }

  if (input.escrowProbability < 0.7) {
    warnings.push("Escrow 달성 확률이 70% 미만으로 설정되어 있습니다.");
  }

  // 설명문 생성
  const explainText = generateExplainText(input, scenarios);

  return {
    basis: {
      equityBasisValue: input.equityBasisValue,
      valuationBasis: input.valuationBasis,
      lockInYears: input.lockInYears,
      discountRate: input.discountRate,
      payout: input.payout,
    },
    inputsEcho: input,
    scenarios,
    warnings,
    explainText,
  };
}

// =====================================================
// 테스트 헬퍼
// =====================================================

/**
 * 케이스 간 일관성 검증 (guaranteed <= expected <= best)
 */
export function validateCaseConsistency(result: Step2V2Result): boolean {
  for (const scenario of result.scenarios) {
    const { guaranteed, expected, best } = scenario.cases;
    if (guaranteed.pv > expected.pv || expected.pv > best.pv) {
      return false;
    }
    if (guaranteed.totalNominal > expected.totalNominal || expected.totalNominal > best.totalNominal) {
      return false;
    }
  }
  return true;
}
