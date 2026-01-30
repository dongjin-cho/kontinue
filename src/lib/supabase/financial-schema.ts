/**
 * 국문 재무제표 표준 스키마 (kr-fin-v1)
 */

// =====================================================
// 메타 정보
// =====================================================

export interface FinancialMeta {
  company_name: string | null;
  source_type: "pdf" | "image" | "xlsx" | "unknown";
  currency: "KRW";
  unit_label: "원" | "천원" | "백만원";
  unit_multiplier: 1 | 1000 | 1000000;
  fiscal_year_end_month: number | null;
}

// =====================================================
// 기간 정보
// =====================================================

export interface FinancialPeriod {
  period_id: string; // "FY2024", "Q1-2025" 등
  label: string; // "2024년", "2025년 1분기"
  type: "FY" | "Q";
  start_date: string; // "YYYY-MM-DD"
  end_date: string;
}

// =====================================================
// 손익계산서
// =====================================================

export interface IncomeStatement {
  revenue: number | null;                  // 매출액
  cost_of_sales: number | null;            // 매출원가
  gross_profit: number | null;             // 매출총이익
  sg_and_a: number | null;                 // 판매비와관리비
  operating_income: number | null;         // 영업이익
  depreciation_amortization: number | null; // 감가상각비
  ebitda: number | null;                   // EBITDA
  non_operating_income: number | null;     // 영업외수익
  non_operating_expense: number | null;    // 영업외비용
  income_before_tax: number | null;        // 법인세비용차감전순이익
  income_tax: number | null;               // 법인세비용
  net_income: number | null;               // 당기순이익
}

// =====================================================
// 재무상태표
// =====================================================

export interface BalanceSheet {
  assets_total: number | null;             // 자산총계
  assets_current: number | null;           // 유동자산
  cash_and_equivalents: number | null;     // 현금및현금성자산
  accounts_receivable: number | null;      // 매출채권
  inventory: number | null;                // 재고자산
  assets_noncurrent: number | null;        // 비유동자산
  liabilities_total: number | null;        // 부채총계
  liabilities_current: number | null;      // 유동부채
  borrowings_short: number | null;         // 단기차입금
  borrowings_long: number | null;          // 장기차입금
  equity_total: number | null;             // 자본총계
}

// =====================================================
// 현금흐름표
// =====================================================

export interface CashFlowStatement {
  net_cash_from_operating: number | null;  // 영업활동현금흐름
  net_cash_from_investing: number | null;  // 투자활동현금흐름
  net_cash_from_financing: number | null;  // 재무활동현금흐름
  capex: number | null;                    // 유형자산취득
  ending_cash: number | null;              // 기말현금
}

// =====================================================
// 전체 재무제표 구조
// =====================================================

export interface FinancialStatements {
  income_statement: Record<string, IncomeStatement>;
  balance_sheet: Record<string, BalanceSheet>;
  cash_flow: Record<string, CashFlowStatement>;
}

// =====================================================
// 완전한 추출 결과 스키마
// =====================================================

export interface ExtractedFinancialData {
  schema_version: "kr-fin-v1";
  meta: FinancialMeta;
  periods: FinancialPeriod[];
  statements: FinancialStatements;
  confidence?: Record<string, number>; // 필드별 신뢰도 (0~1)
  source_map?: Record<string, { page: number | null; label: string | null }>; // 원본 위치
}

// =====================================================
// 정규화된 요약 (Step1/2 연결용)
// =====================================================

export interface NormalizedSummary {
  period_id: string;
  period_label: string;
  currency: "KRW";
  // 손익계산서
  revenue: number | null;
  operating_income: number | null;
  ebitda: number | null;
  net_income: number | null;
  // 재무상태표
  assets_total: number | null;
  liabilities_total: number | null;
  cash_and_equivalents: number | null;
  total_debt: number | null; // borrowings_short + borrowings_long
  equity_total: number | null;
  // 계산값
  net_debt: number | null; // total_debt - cash_and_equivalents
}

// =====================================================
// 유틸리티 함수
// =====================================================

/**
 * 단위 정규화 (원 단위로 변환)
 */
export function normalizeToKRW(
  value: number | null,
  multiplier: 1 | 1000 | 1000000
): number | null {
  if (value === null) return null;
  return value * multiplier;
}

/**
 * EBITDA 계산 (없는 경우)
 */
export function calculateEbitda(
  operatingIncome: number | null,
  depreciationAmortization: number | null
): number | null {
  if (operatingIncome === null) return null;
  if (depreciationAmortization === null) return operatingIncome; // 감가상각 없으면 영업이익 그대로
  return operatingIncome + depreciationAmortization;
}

/**
 * 총 차입금 계산
 */
export function calculateTotalDebt(
  borrowingsShort: number | null,
  borrowingsLong: number | null
): number | null {
  const short = borrowingsShort ?? 0;
  const long = borrowingsLong ?? 0;
  if (borrowingsShort === null && borrowingsLong === null) return null;
  return short + long;
}

/**
 * 순차입금 계산
 */
export function calculateNetDebt(
  totalDebt: number | null,
  cash: number | null
): number | null {
  if (totalDebt === null) return null;
  return totalDebt - (cash ?? 0);
}

/**
 * 특정 기간의 정규화된 요약 생성
 */
export function createNormalizedSummary(
  data: ExtractedFinancialData,
  periodId: string
): NormalizedSummary | null {
  const period = data.periods.find((p) => p.period_id === periodId);
  if (!period) return null;

  const multiplier = data.meta.unit_multiplier;
  const income = data.statements.income_statement[periodId];
  const balance = data.statements.balance_sheet[periodId];

  if (!income && !balance) return null;

  const totalDebt = balance
    ? calculateTotalDebt(
        normalizeToKRW(balance.borrowings_short, multiplier),
        normalizeToKRW(balance.borrowings_long, multiplier)
      )
    : null;

  const cash = balance
    ? normalizeToKRW(balance.cash_and_equivalents, multiplier)
    : null;

  // EBITDA 계산 (없으면 operating_income + depreciation)
  let ebitda = income ? normalizeToKRW(income.ebitda, multiplier) : null;
  if (ebitda === null && income) {
    ebitda = calculateEbitda(
      normalizeToKRW(income.operating_income, multiplier),
      normalizeToKRW(income.depreciation_amortization, multiplier)
    );
  }

  return {
    period_id: periodId,
    period_label: period.label,
    currency: "KRW",
    // 손익계산서
    revenue: income ? normalizeToKRW(income.revenue, multiplier) : null,
    operating_income: income
      ? normalizeToKRW(income.operating_income, multiplier)
      : null,
    ebitda,
    net_income: income ? normalizeToKRW(income.net_income, multiplier) : null,
    // 재무상태표
    assets_total: balance
      ? normalizeToKRW(balance.assets_total, multiplier)
      : null,
    liabilities_total: balance
      ? normalizeToKRW(balance.liabilities_total, multiplier)
      : null,
    cash_and_equivalents: cash,
    total_debt: totalDebt,
    equity_total: balance
      ? normalizeToKRW(balance.equity_total, multiplier)
      : null,
    // 계산값
    net_debt: calculateNetDebt(totalDebt, cash),
  };
}

/**
 * 기본 빈 스키마 생성
 */
export function createEmptyFinancialData(): ExtractedFinancialData {
  return {
    schema_version: "kr-fin-v1",
    meta: {
      company_name: null,
      source_type: "unknown",
      currency: "KRW",
      unit_label: "원",
      unit_multiplier: 1,
      fiscal_year_end_month: 12,
    },
    periods: [],
    statements: {
      income_statement: {},
      balance_sheet: {},
      cash_flow: {},
    },
  };
}

// =====================================================
// 레거시 매핑 (기존 extracted_json → kr-fin-v1)
// =====================================================

export interface LegacyExtractedFinancials {
  revenue?: number;
  gross_profit?: number;
  operating_income?: number;
  ebitda?: number;
  net_income?: number;
  assets?: number;
  liabilities?: number;
  cash?: number;
  total_debt?: number;
  fiscal_year?: number;
  currency?: string;
}

/**
 * 레거시 형식을 새 스키마로 변환
 */
export function convertLegacyToV1(
  legacy: LegacyExtractedFinancials,
  fileName?: string
): ExtractedFinancialData {
  const fiscalYear = legacy.fiscal_year || new Date().getFullYear();
  const periodId = `FY${fiscalYear}`;

  return {
    schema_version: "kr-fin-v1",
    meta: {
      company_name: null,
      source_type: fileName?.endsWith(".pdf")
        ? "pdf"
        : fileName?.endsWith(".xlsx")
        ? "xlsx"
        : "unknown",
      currency: "KRW",
      unit_label: "원",
      unit_multiplier: 1,
      fiscal_year_end_month: 12,
    },
    periods: [
      {
        period_id: periodId,
        label: `${fiscalYear}년`,
        type: "FY",
        start_date: `${fiscalYear}-01-01`,
        end_date: `${fiscalYear}-12-31`,
      },
    ],
    statements: {
      income_statement: {
        [periodId]: {
          revenue: legacy.revenue ?? null,
          cost_of_sales: null,
          gross_profit: legacy.gross_profit ?? null,
          sg_and_a: null,
          operating_income: legacy.operating_income ?? null,
          depreciation_amortization: null,
          ebitda: legacy.ebitda ?? null,
          non_operating_income: null,
          non_operating_expense: null,
          income_before_tax: null,
          income_tax: null,
          net_income: legacy.net_income ?? null,
        },
      },
      balance_sheet: {
        [periodId]: {
          assets_total: legacy.assets ?? null,
          assets_current: null,
          cash_and_equivalents: legacy.cash ?? null,
          accounts_receivable: null,
          inventory: null,
          assets_noncurrent: null,
          liabilities_total: legacy.liabilities ?? null,
          liabilities_current: null,
          borrowings_short: null,
          borrowings_long: legacy.total_debt ?? null,
          equity_total: null,
        },
      },
      cash_flow: {},
    },
  };
}
