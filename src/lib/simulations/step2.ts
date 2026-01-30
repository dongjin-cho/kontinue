/**
 * Step2 시뮬레이션 로직
 * 락인 기간, 지분 시나리오, 지급 구조에 따른 현금흐름 및 현재가치 계산
 */

import type { Step2Input, Step2Result, ScenarioResult, ScenarioKPIs } from "./types";

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
 * 단일 시나리오에 대한 현금흐름 생성
 */
export function generateCashflows(
  totalProceeds: number,
  lockInYears: number,
  payout: { upfrontPct: number; escrowPct: number; earnoutPct: number }
): number[] {
  const cashflows: number[] = new Array(lockInYears + 1).fill(0);
  
  // t=0: upfront만
  const upfrontAmount = totalProceeds * (payout.upfrontPct / 100);
  cashflows[0] = upfrontAmount;
  
  // earnout: 락인 기간 동안 균등 분할 지급
  const earnoutTotal = totalProceeds * (payout.earnoutPct / 100);
  const earnoutEachYear = lockInYears > 0 ? earnoutTotal / lockInYears : 0;
  
  // t=1..lockInYears-1: earnout만
  for (let t = 1; t < lockInYears; t++) {
    cashflows[t] = earnoutEachYear;
  }
  
  // t=lockInYears: earnout + escrow
  const escrowAmount = totalProceeds * (payout.escrowPct / 100);
  cashflows[lockInYears] = earnoutEachYear + escrowAmount;
  
  return cashflows;
}

/**
 * 시나리오별 KPI 계산
 */
export function calculateKPIs(
  totalProceeds: number,
  pv: number,
  cashflows: number[],
  lockInYears: number
): ScenarioKPIs {
  return {
    immediateAmount: cashflows[0],
    finalAmount: cashflows[lockInYears],
    pvToTotalRatio: totalProceeds > 0 ? pv / totalProceeds : 0,
  };
}

/**
 * 설명문 생성
 */
function generateExplainText(
  input: Step2Input,
  scenarios: ScenarioResult[]
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
  
  // 3. PV 영향 설명
  if (input.lockInYears > 1) {
    const firstScenario = scenarios[0];
    if (firstScenario) {
      const pvRatio = firstScenario.kpis.pvToTotalRatio;
      const lossRatio = ((1 - pvRatio) * 100).toFixed(1);
      parts.push(
        `락인 기간과 할인율을 고려하면, 총 수령액 대비 현재가치는 약 ${(pvRatio * 100).toFixed(1)}%로, ` +
        `시간가치 손실이 약 ${lossRatio}% 발생합니다.`
      );
    }
  }
  
  // 4. 지급 구조에 따른 리스크 설명
  if (escrowPct + earnoutPct > 50) {
    parts.push(
      `Escrow와 Earn-out 비중이 ${(escrowPct + earnoutPct).toFixed(0)}%로 높아, ` +
      `후행 지급에 따른 불확실성이 있습니다.`
    );
  }
  
  // 5. 즉시 수령액 강조
  if (upfrontPct >= 50) {
    parts.push(
      `즉시 지급 비중이 ${upfrontPct}%로 높아, 거래 종결 시점에 상당 부분을 수령할 수 있습니다.`
    );
  }
  
  return parts.join(" ");
}

/**
 * Step2 시뮬레이션 실행
 */
export function simulateStep2(input: Step2Input): Step2Result {
  const warnings: string[] = [];
  
  // 지분 시나리오 중복 체크
  const uniqueScenarios = new Set(input.equityScenarios);
  if (uniqueScenarios.size !== input.equityScenarios.length) {
    warnings.push("중복된 지분 시나리오가 있습니다.");
  }
  
  // 시나리오별 계산
  const scenarios: ScenarioResult[] = input.equityScenarios.map((equityPct) => {
    // 총 수령액
    const totalProceeds = input.equityBasisValue * (equityPct / 100);
    
    // 현금흐름 생성
    const cashflows = generateCashflows(
      totalProceeds,
      input.lockInYears,
      input.payout
    );
    
    // 현재가치 계산
    const pv = calculatePV(cashflows, input.discountRate);
    
    // KPI 계산
    const kpis = calculateKPIs(totalProceeds, pv, cashflows, input.lockInYears);
    
    return {
      equityPct,
      totalProceeds: Math.round(totalProceeds),
      pv: Math.round(pv),
      cashflows: cashflows.map((cf) => Math.round(cf)),
      kpis: {
        immediateAmount: Math.round(kpis.immediateAmount),
        finalAmount: Math.round(kpis.finalAmount),
        pvToTotalRatio: Math.round(kpis.pvToTotalRatio * 1000) / 1000,
      },
    };
  });
  
  // 높은 할인율 경고
  if (input.discountRate > 0.15) {
    warnings.push("할인율이 15%를 초과하여 현재가치가 크게 감소합니다.");
  }
  
  // 낮은 즉시 지급 비율 경고
  if (input.payout.upfrontPct < 30) {
    warnings.push("즉시 지급 비율이 30% 미만으로 유동성 위험이 있을 수 있습니다.");
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
    scenarios,
    warnings,
    explainText,
  };
}
