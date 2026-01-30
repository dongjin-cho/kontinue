/**
 * 숫자 포맷팅 유틸리티
 */

/**
 * 숫자를 천단위 콤마가 포함된 문자열로 변환
 */
export function formatNumberWithCommas(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/,/g, "")) : value;
  if (isNaN(num)) return "";
  return num.toLocaleString("ko-KR");
}

/**
 * 콤마가 포함된 문자열에서 숫자 추출
 */
export function parseNumberFromString(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * KRW를 억/만원 단위로 표시 (상세 버전)
 */
export function formatKRWDetailed(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000_000) {
    // 1조 이상
    const trillions = absValue / 1_000_000_000_000;
    return `${sign}${trillions.toFixed(1)}조 원`;
  } else if (absValue >= 100_000_000) {
    // 1억 이상
    const billions = absValue / 100_000_000;
    if (billions >= 1000) {
      return `${sign}${(billions / 10000).toFixed(1)}조 원`;
    } else if (billions >= 100) {
      return `${sign}${Math.round(billions).toLocaleString()}억 원`;
    } else if (billions >= 10) {
      return `${sign}${billions.toFixed(0)}억 원`;
    }
    return `${sign}${billions.toFixed(1)}억 원`;
  } else if (absValue >= 10_000) {
    // 1만원 이상
    const tenThousands = absValue / 10_000;
    if (tenThousands >= 1000) {
      return `${sign}${(tenThousands / 10000).toFixed(1)}억 원`;
    }
    return `${sign}${Math.round(tenThousands).toLocaleString()}만 원`;
  } else if (absValue >= 1) {
    return `${sign}${Math.round(absValue).toLocaleString()}원`;
  }
  return "0원";
}

/**
 * KRW를 간결한 억 단위로 표시
 */
export function formatKRWBillions(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  
  const billions = absValue / 100_000_000;
  
  if (billions >= 10000) {
    return `${sign}${(billions / 10000).toFixed(1)}조`;
  } else if (billions >= 100) {
    return `${sign}${Math.round(billions).toLocaleString()}억`;
  } else if (billions >= 1) {
    return `${sign}${billions.toFixed(1)}억`;
  } else {
    const millions = absValue / 10_000;
    return `${sign}${Math.round(millions).toLocaleString()}만`;
  }
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: number, includeSign = false): string {
  const sign = includeSign && value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(0)}%`;
}

/**
 * 입력값 유효성 검사 - 숫자만 허용 (천단위 콤마 포함)
 */
export function sanitizeNumericInput(value: string): string {
  // 숫자와 콤마만 유지
  return value.replace(/[^0-9]/g, "");
}

/**
 * 입력 중인 값을 포맷팅 (실시간 천단위 콤마)
 */
export function formatInputValue(value: string): string {
  const sanitized = sanitizeNumericInput(value);
  if (!sanitized) return "";
  const num = parseInt(sanitized, 10);
  if (isNaN(num)) return "";
  return num.toLocaleString("ko-KR");
}
