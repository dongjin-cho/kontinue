/**
 * 외부 파서 응답을 kr-fin-v1 스키마로 매핑하는 레이어
 */

import {
  ExtractedFinancialData,
  createEmptyFinancialData,
  LegacyExtractedFinancials,
  convertLegacyToV1,
} from "./financial-schema";

// =====================================================
// 키워드 매핑 테이블
// =====================================================

const INCOME_STATEMENT_KEYWORDS: Record<string, string[]> = {
  revenue: ["매출액", "매출", "revenue", "sales", "총매출"],
  cost_of_sales: ["매출원가", "원가", "cost of sales", "cogs"],
  gross_profit: ["매출총이익", "매출총손익", "gross profit"],
  sg_and_a: ["판매비와관리비", "판관비", "sg&a", "sga"],
  operating_income: ["영업이익", "영업손익", "operating income", "op"],
  depreciation_amortization: ["감가상각비", "depreciation", "amortization"],
  ebitda: ["ebitda", "에비타", "EBITDA"],
  net_income: ["당기순이익", "순이익", "net income", "profit"],
  income_before_tax: ["법인세비용차감전순이익", "세전이익", "income before tax"],
  income_tax: ["법인세비용", "법인세", "income tax"],
};

const BALANCE_SHEET_KEYWORDS: Record<string, string[]> = {
  assets_total: ["자산총계", "총자산", "total assets", "assets"],
  assets_current: ["유동자산", "current assets"],
  cash_and_equivalents: ["현금및현금성자산", "현금", "cash", "cash and equivalents"],
  accounts_receivable: ["매출채권", "외상매출금", "accounts receivable", "ar"],
  inventory: ["재고자산", "재고", "inventory"],
  assets_noncurrent: ["비유동자산", "non-current assets", "fixed assets"],
  liabilities_total: ["부채총계", "총부채", "total liabilities", "liabilities"],
  liabilities_current: ["유동부채", "current liabilities"],
  borrowings_short: ["단기차입금", "단기부채", "short-term borrowings"],
  borrowings_long: ["장기차입금", "장기부채", "long-term borrowings", "long-term debt"],
  equity_total: ["자본총계", "총자본", "total equity", "equity", "shareholders equity"],
};

// =====================================================
// 매핑 함수
// =====================================================

/**
 * 키워드 기반으로 필드 매핑 시도
 */
function mapFieldByKeyword(
  rawData: Record<string, unknown>,
  keywords: string[]
): number | null {
  // 정확한 키 매칭 먼저
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    for (const [key, value] of Object.entries(rawData)) {
      if (key.toLowerCase() === lowerKeyword && typeof value === "number") {
        return value;
      }
    }
  }

  // 부분 매칭
  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase();
    for (const [key, value] of Object.entries(rawData)) {
      if (
        key.toLowerCase().includes(lowerKeyword) &&
        typeof value === "number"
      ) {
        return value;
      }
    }
  }

  return null;
}

/**
 * 외부 파서 응답을 kr-fin-v1으로 변환
 */
export function mapExternalParserResponse(
  rawExtracted: Record<string, unknown>,
  fileName?: string
): { data: ExtractedFinancialData; warnings: string[] } {
  const warnings: string[] = [];

  // 이미 kr-fin-v1 형식인지 체크
  if (rawExtracted.schema_version === "kr-fin-v1") {
    return { data: rawExtracted as ExtractedFinancialData, warnings: [] };
  }

  // 레거시 단순 형식인지 체크 (revenue, ebitda 등 직접 필드)
  if (
    rawExtracted.revenue !== undefined ||
    rawExtracted.operating_income !== undefined
  ) {
    const legacy: LegacyExtractedFinancials = {
      revenue: rawExtracted.revenue as number | undefined,
      gross_profit: rawExtracted.gross_profit as number | undefined,
      operating_income: rawExtracted.operating_income as number | undefined,
      ebitda: rawExtracted.ebitda as number | undefined,
      net_income: rawExtracted.net_income as number | undefined,
      assets: rawExtracted.assets as number | undefined,
      liabilities: rawExtracted.liabilities as number | undefined,
      cash: rawExtracted.cash as number | undefined,
      total_debt: rawExtracted.total_debt as number | undefined,
      fiscal_year: rawExtracted.fiscal_year as number | undefined,
    };
    warnings.push("레거시 형식 데이터가 새 스키마로 변환되었습니다.");
    return { data: convertLegacyToV1(legacy, fileName), warnings };
  }

  // 키워드 기반 매핑 시도
  const result = createEmptyFinancialData();
  const currentYear = new Date().getFullYear();
  const periodId = `FY${currentYear}`;

  // 기간 설정
  result.periods.push({
    period_id: periodId,
    label: `${currentYear}년`,
    type: "FY",
    start_date: `${currentYear}-01-01`,
    end_date: `${currentYear}-12-31`,
  });

  // 손익계산서 매핑
  const incomeStatement: Record<string, number | null> = {};
  let incomeMapped = 0;
  for (const [field, keywords] of Object.entries(INCOME_STATEMENT_KEYWORDS)) {
    const value = mapFieldByKeyword(rawExtracted, keywords);
    incomeStatement[field] = value;
    if (value !== null) incomeMapped++;
  }

  if (incomeMapped > 0) {
    result.statements.income_statement[periodId] = incomeStatement as unknown as ExtractedFinancialData["statements"]["income_statement"][string];
  }

  // 재무상태표 매핑
  const balanceSheet: Record<string, number | null> = {};
  let balanceMapped = 0;
  for (const [field, keywords] of Object.entries(BALANCE_SHEET_KEYWORDS)) {
    const value = mapFieldByKeyword(rawExtracted, keywords);
    balanceSheet[field] = value;
    if (value !== null) balanceMapped++;
  }

  if (balanceMapped > 0) {
    result.statements.balance_sheet[periodId] = balanceSheet as unknown as ExtractedFinancialData["statements"]["balance_sheet"][string];
  }

  // 메타 정보 추출 시도
  if (typeof rawExtracted.company_name === "string") {
    result.meta.company_name = rawExtracted.company_name;
  }

  // 단위 추정
  if (typeof rawExtracted.unit === "string") {
    const unit = rawExtracted.unit.toLowerCase();
    if (unit.includes("백만") || unit.includes("million")) {
      result.meta.unit_label = "백만원";
      result.meta.unit_multiplier = 1000000;
    } else if (unit.includes("천") || unit.includes("thousand")) {
      result.meta.unit_label = "천원";
      result.meta.unit_multiplier = 1000;
    }
  }

  // 경고 생성
  if (incomeMapped === 0 && balanceMapped === 0) {
    warnings.push("재무 데이터를 추출하지 못했습니다. 수동 입력이 필요합니다.");
  } else {
    if (incomeMapped < 3) {
      warnings.push("손익계산서 데이터가 불완전합니다.");
    }
    if (balanceMapped < 3) {
      warnings.push("재무상태표 데이터가 불완전합니다.");
    }
  }

  // 필수 필드 체크
  const income = result.statements.income_statement[periodId];
  const balance = result.statements.balance_sheet[periodId];

  if (!income?.revenue && !income?.operating_income && !income?.net_income) {
    warnings.push("매출액, 영업이익, 순이익 중 하나 이상이 필요합니다.");
  }
  if (!balance?.assets_total && !balance?.liabilities_total && !balance?.cash_and_equivalents) {
    warnings.push("자산총계, 부채총계, 현금 중 하나 이상이 필요합니다.");
  }

  return { data: result, warnings };
}

/**
 * Step1 입력값과 재무제표 비교
 */
export interface ReconciliationResult {
  matches: boolean;
  differences: {
    field: string;
    step1Value: number;
    documentValue: number;
    diffPercent: number;
  }[];
  warnings: string[];
}

export function reconcileWithStep1(
  step1Inputs: {
    revenue?: number;
    ebitda?: number;
    netIncome?: number;
    totalDebt?: number;
    cash?: number;
  },
  documentSummary: {
    revenue: number | null;
    ebitda: number | null;
    net_income: number | null;
    total_debt: number | null;
    cash_and_equivalents: number | null;
  }
): ReconciliationResult {
  const differences: ReconciliationResult["differences"] = [];
  const warnings: string[] = [];

  const THRESHOLD = 0.1; // 10% 차이 허용

  const checkField = (
    name: string,
    step1Val: number | undefined,
    docVal: number | null
  ) => {
    if (step1Val === undefined || docVal === null) return;

    const diffPercent = Math.abs(step1Val - docVal) / Math.max(step1Val, 1);
    if (diffPercent > THRESHOLD) {
      differences.push({
        field: name,
        step1Value: step1Val,
        documentValue: docVal,
        diffPercent: Math.round(diffPercent * 100),
      });
    }
  };

  checkField("매출액", step1Inputs.revenue, documentSummary.revenue);
  checkField("EBITDA", step1Inputs.ebitda, documentSummary.ebitda);
  checkField("순이익", step1Inputs.netIncome, documentSummary.net_income);
  checkField("총차입금", step1Inputs.totalDebt, documentSummary.total_debt);
  checkField("현금", step1Inputs.cash, documentSummary.cash_and_equivalents);

  if (differences.length > 0) {
    warnings.push(
      `Step1 입력값과 재무제표 값이 ${differences.length}개 항목에서 10% 이상 차이가 있습니다.`
    );
  }

  return {
    matches: differences.length === 0,
    differences,
    warnings,
  };
}
