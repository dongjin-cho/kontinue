/**
 * Step1 기업가치 평가 로직
 * EV/EBITDA 기반 상대가치 평가 + DLOM + 기업특성 보정
 */

import {
  IndustryGroup,
  INDUSTRY_MULTIPLES,
  KSIC_TO_INDUSTRY,
  KSIC_SUBCLASS_OVERRIDES,
  DEFAULT_DLOM,
  WEIGHT_INDUSTRY,
  WEIGHT_PEER,
  PEER_PROXY_MULTIPLIER,
  GROWTH_ADJUSTMENTS,
  SIZE_ADJUSTMENTS,
  AGE_ADJUSTMENTS,
  EV_RANGE_SPREAD,
} from "./constants";
import type { Step1Input, Step1Result, MultiplesInfo, AdjustmentsInfo, ValidationWarning } from "./types";

/**
 * KSIC 코드를 산업군으로 매핑
 */
export function mapKsicToIndustry(ksicCode: string): IndustryGroup {
  if (!ksicCode || ksicCode.length === 0) {
    return "기타";
  }
  
  // 대분류 코드 (첫 글자, 알파벳)
  const majorCode = ksicCode.charAt(0).toUpperCase();
  
  // 중분류 코드 (2~3번째 문자, 숫자)
  const subCode = ksicCode.substring(1, 3);
  
  // 중분류 특수 매핑 체크 (예: J62 -> SaaS/플랫폼)
  if (majorCode === "J" && subCode && KSIC_SUBCLASS_OVERRIDES[subCode]) {
    return KSIC_SUBCLASS_OVERRIDES[subCode];
  }
  
  // 대분류 매핑
  return KSIC_TO_INDUSTRY[majorCode] || "기타";
}

/**
 * 입력 정합성 검사
 */
export function validateInputConsistency(input: Step1Input): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const currentYear = new Date().getFullYear();
  
  // EBITDA가 매출의 50% 초과 시 경고
  if (input.revenue > 0 && Math.abs(input.ebitda) > input.revenue * 0.5) {
    warnings.push({
      field: "ebitda",
      message: "EBITDA가 매출액의 50%를 초과합니다. 입력값을 확인해주세요.",
      severity: "warning",
    });
  }
  
  // 순이익이 매출의 50% 초과 시 경고
  if (input.revenue > 0 && Math.abs(input.netIncome) > input.revenue * 0.5) {
    warnings.push({
      field: "netIncome",
      message: "순이익이 매출액의 50%를 초과합니다. 입력값을 확인해주세요.",
      severity: "warning",
    });
  }
  
  // 순이익이 EBITDA보다 큰 경우 경고
  if (input.netIncome > input.ebitda) {
    warnings.push({
      field: "netIncome",
      message: "순이익이 EBITDA보다 큽니다. 일반적이지 않은 수치입니다.",
      severity: "warning",
    });
  }
  
  // 설립연도 검사
  if (input.foundedYear > currentYear) {
    warnings.push({
      field: "foundedYear",
      message: "설립연도가 현재 연도보다 클 수 없습니다.",
      severity: "error",
    });
  }
  
  // 성장률 범위 검사
  if (input.revenueGrowth < -100 || input.revenueGrowth > 300) {
    warnings.push({
      field: "revenueGrowth",
      message: "성장률은 -100% ~ 300% 범위 내여야 합니다.",
      severity: "error",
    });
  }
  
  return warnings;
}

/**
 * 성장률 보정 계산
 */
export function calculateGrowthAdjustment(revenueGrowth: number): number {
  if (revenueGrowth >= GROWTH_ADJUSTMENTS.high.threshold) {
    return GROWTH_ADJUSTMENTS.high.adj; // +15%
  } else if (revenueGrowth >= GROWTH_ADJUSTMENTS.medium.threshold) {
    return GROWTH_ADJUSTMENTS.medium.adj; // +7%
  } else if (revenueGrowth >= GROWTH_ADJUSTMENTS.low.threshold) {
    return GROWTH_ADJUSTMENTS.low.adj; // 0%
  } else {
    return GROWTH_ADJUSTMENTS.negative.adj; // -15%
  }
}

/**
 * 규모(직원 수) 보정 계산
 */
export function calculateSizeAdjustment(employeeBand: string): number {
  return SIZE_ADJUSTMENTS[employeeBand] ?? 0;
}

/**
 * 업력 보정 계산
 */
export function calculateAgeAdjustment(foundedYear: number): number {
  const currentYear = new Date().getFullYear();
  const companyAge = currentYear - foundedYear;
  
  if (companyAge < AGE_ADJUSTMENTS.young.maxAge) {
    return AGE_ADJUSTMENTS.young.adj; // -7%
  } else if (companyAge < AGE_ADJUSTMENTS.medium.maxAge) {
    return AGE_ADJUSTMENTS.medium.adj; // -3%
  } else {
    return AGE_ADJUSTMENTS.mature.adj; // 0%
  }
}

/**
 * 최종 멀티플 계산 (DLOM 반영)
 */
export function calculateFinalMultiples(industryGroup: IndustryGroup): MultiplesInfo {
  const industryMultiple = INDUSTRY_MULTIPLES[industryGroup];
  
  // Peer proxy median = 산업군 median * 1.2
  const peerProxyMedian = industryMultiple.median * PEER_PROXY_MULTIPLIER;
  
  // DLOM 적용된 Peer 멀티플
  const peerWithDlom = {
    low: industryMultiple.low * PEER_PROXY_MULTIPLIER * (1 - DEFAULT_DLOM),
    median: peerProxyMedian * (1 - DEFAULT_DLOM),
    high: industryMultiple.high * PEER_PROXY_MULTIPLIER * (1 - DEFAULT_DLOM),
  };
  
  // 가중 평균 계산
  const finalLow = WEIGHT_INDUSTRY * industryMultiple.low + WEIGHT_PEER * peerWithDlom.low;
  const finalMedian = WEIGHT_INDUSTRY * industryMultiple.median + WEIGHT_PEER * peerWithDlom.median;
  const finalHigh = WEIGHT_INDUSTRY * industryMultiple.high + WEIGHT_PEER * peerWithDlom.high;
  
  return {
    industryLow: industryMultiple.low,
    industryMedian: industryMultiple.median,
    industryHigh: industryMultiple.high,
    peerProxyMedian,
    dlom: DEFAULT_DLOM,
    weights: {
      industry: WEIGHT_INDUSTRY,
      peer: WEIGHT_PEER,
    },
    finalLow: Math.round(finalLow * 100) / 100,
    finalMedian: Math.round(finalMedian * 100) / 100,
    finalHigh: Math.round(finalHigh * 100) / 100,
  };
}

/**
 * 설명문 생성
 */
function generateExplainText(
  input: Step1Input,
  industryGroup: IndustryGroup,
  multiples: MultiplesInfo,
  adjustments: AdjustmentsInfo,
  enterpriseValue: { rangeLow: number; rangeHigh: number },
  equityValue: { low: number; high: number },
  netDebt: number,
  warnings: ValidationWarning[]
): string {
  const parts: string[] = [];
  
  // 1. 평가 방법 설명
  parts.push(
    `귀사는 ${industryGroup} 산업군으로 분류되어, 해당 산업의 EV/EBITDA 멀티플(${multiples.finalMedian.toFixed(1)}배)을 적용하였습니다.`
  );
  
  // 2. DLOM 설명
  parts.push(
    `비상장 기업의 유동성 부족을 반영하여 ${(multiples.dlom * 100).toFixed(0)}%의 DLOM(비유동성 할인)을 적용하였습니다.`
  );
  
  // 3. 보정 요인 설명
  const adjParts: string[] = [];
  if (adjustments.growthAdj !== 0) {
    const sign = adjustments.growthAdj > 0 ? "+" : "";
    adjParts.push(`성장률 보정 ${sign}${(adjustments.growthAdj * 100).toFixed(0)}%`);
  }
  if (adjustments.sizeAdj !== 0) {
    const sign = adjustments.sizeAdj > 0 ? "+" : "";
    adjParts.push(`규모 보정 ${sign}${(adjustments.sizeAdj * 100).toFixed(0)}%`);
  }
  if (adjustments.ageAdj !== 0) {
    const sign = adjustments.ageAdj > 0 ? "+" : "";
    adjParts.push(`업력 보정 ${sign}${(adjustments.ageAdj * 100).toFixed(0)}%`);
  }
  
  if (adjParts.length > 0) {
    parts.push(`기업 특성을 반영하여 ${adjParts.join(", ")}을 적용하였습니다.`);
  }
  
  // 4. 범위 설명
  parts.push(
    `평가 결과의 불확실성을 반영하여 ±${warnings.length >= 2 ? "15" : "10"}% 범위로 제시하였습니다.`
  );
  
  // 5. 순차입금 설명
  if (netDebt !== 0) {
    const netDebtDesc = netDebt > 0 ? "순차입금" : "순현금";
    parts.push(
      `${netDebtDesc} ${formatKRW(Math.abs(netDebt))}을 반영하여 최종 지분가치를 산출하였습니다.`
    );
  }
  
  // 6. 경고 반영
  if (warnings.length > 0) {
    parts.push(`※ 입력된 재무정보에 일부 비정상적인 수치가 있어 결과 해석에 주의가 필요합니다.`);
  }
  
  return parts.join(" ");
}

/**
 * KRW 포맷팅 (억/만원 단위)
 */
export function formatKRW(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  if (absValue >= 100_000_000) {
    // 1억 이상
    const billions = absValue / 100_000_000;
    if (billions >= 10) {
      return `${sign}${Math.round(billions).toLocaleString()}억 원`;
    }
    return `${sign}${billions.toFixed(1)}억 원`;
  } else if (absValue >= 10_000) {
    // 1만원 이상
    const tenThousands = absValue / 10_000;
    return `${sign}${Math.round(tenThousands).toLocaleString()}만 원`;
  } else {
    return `${sign}${Math.round(absValue).toLocaleString()}원`;
  }
}

/**
 * Step1 기업가치 평가 실행
 */
export function calculateStep1Valuation(input: Step1Input): Step1Result {
  // 1. 입력 정합성 검사
  const validationWarnings = validateInputConsistency(input);
  const warnings = validationWarnings.map((w) => w.message);
  const hasErrors = validationWarnings.some((w) => w.severity === "error");
  
  // 2. 산업군 매핑
  const industryGroup: IndustryGroup = input.industryGroup || mapKsicToIndustry(input.industryCode);
  
  // 3. EBITDA 기반 평가 가능성 판단
  if (input.ebitda <= 0) {
    return {
      valuationMethod: "EV/EBITDA (Relative)",
      canEvaluate: false,
      fallbackReason:
        "EBITDA가 0 이하로 EV/EBITDA 기반 상대가치 평가가 불가합니다. 매출 기반 PSR 로직은 추후 지원 예정입니다.",
      industryGroup,
      ksic: input.industryCode,
      inputs: input,
      multiples: {
        industryLow: 0,
        industryMedian: 0,
        industryHigh: 0,
        peerProxyMedian: 0,
        dlom: DEFAULT_DLOM,
        weights: { industry: WEIGHT_INDUSTRY, peer: WEIGHT_PEER },
        finalLow: 0,
        finalMedian: 0,
        finalHigh: 0,
      },
      adjustments: {
        growthAdj: 0,
        sizeAdj: 0,
        ageAdj: 0,
        totalAdj: 0,
      },
      enterpriseValue: {
        baseMid: 0,
        afterAdjustmentsMid: 0,
        rangeLow: 0,
        rangeHigh: 0,
      },
      netDebt: input.totalDebt - input.cash,
      equityValue: { low: 0, high: 0 },
      warnings,
      explainText:
        "귀사의 EBITDA가 0 이하이므로 EV/EBITDA 배수를 적용한 상대가치 평가가 어렵습니다. 매출 기반 평가(PSR) 또는 자산 기반 평가가 필요하며, 해당 기능은 2단계에서 지원 예정입니다.",
    };
  }
  
  // 4. 멀티플 계산
  const multiples = calculateFinalMultiples(industryGroup);
  
  // 5. Base EV 계산
  const baseEvLow = input.ebitda * multiples.finalLow;
  const baseEvMid = input.ebitda * multiples.finalMedian;
  const baseEvHigh = input.ebitda * multiples.finalHigh;
  
  // 6. 보정 계산
  const growthAdj = calculateGrowthAdjustment(input.revenueGrowth);
  const sizeAdj = calculateSizeAdjustment(input.employeeBand);
  const ageAdj = calculateAgeAdjustment(input.foundedYear);
  
  // 총 보정률 (순차적 적용)
  const totalMultiplier = (1 + growthAdj) * (1 + sizeAdj) * (1 + ageAdj);
  const totalAdj = totalMultiplier - 1;
  
  // 7. 보정 적용된 EV
  const evAfterAdjMid = baseEvMid * totalMultiplier;
  
  // 8. EV Range 확정
  const warningCount = validationWarnings.filter((w) => w.severity === "warning").length;
  const spread = warningCount >= 2 ? EV_RANGE_SPREAD.wide : EV_RANGE_SPREAD.normal;
  
  const evRangeLow = evAfterAdjMid * spread.low;
  const evRangeHigh = evAfterAdjMid * spread.high;
  
  // 9. Net Debt 반영 -> Equity Value
  const netDebt = input.totalDebt - input.cash;
  const equityLow = Math.max(0, evRangeLow - netDebt);
  const equityHigh = Math.max(0, evRangeHigh - netDebt);
  
  // Equity가 0인 경우 경고 추가
  if (equityLow === 0 || equityHigh === 0) {
    warnings.push("순차입금이 커서 지분가치가 낮게 산출되었습니다.");
  }
  
  // 10. 설명문 생성
  const adjustments: AdjustmentsInfo = {
    growthAdj,
    sizeAdj,
    ageAdj,
    totalAdj,
  };
  
  const explainText = generateExplainText(
    input,
    industryGroup,
    multiples,
    adjustments,
    { rangeLow: evRangeLow, rangeHigh: evRangeHigh },
    { low: equityLow, high: equityHigh },
    netDebt,
    validationWarnings
  );
  
  return {
    valuationMethod: "EV/EBITDA (Relative)",
    canEvaluate: true,
    industryGroup,
    ksic: input.industryCode,
    inputs: input,
    multiples,
    adjustments,
    enterpriseValue: {
      baseMid: Math.round(baseEvMid),
      afterAdjustmentsMid: Math.round(evAfterAdjMid),
      rangeLow: Math.round(evRangeLow),
      rangeHigh: Math.round(evRangeHigh),
    },
    netDebt: Math.round(netDebt),
    equityValue: {
      low: Math.round(equityLow),
      high: Math.round(equityHigh),
    },
    warnings,
    explainText,
  };
}
