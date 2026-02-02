// 기업가치 평가 상수 및 멀티플 테이블

export type IndustryGroup =
  | "제조업"
  | "IT서비스"
  | "SaaS/플랫폼"
  | "유통/커머스"
  | "헬스케어"
  | "기타";

export interface MultipleRange {
  low: number;
  median: number;
  high: number;
}

// 산업군별 EV/EBITDA 멀티플 테이블
export const INDUSTRY_MULTIPLES: Record<IndustryGroup, MultipleRange> = {
  제조업: { low: 4.0, median: 5.5, high: 7.0 },
  IT서비스: { low: 5.0, median: 7.0, high: 9.0 },
  "SaaS/플랫폼": { low: 8.0, median: 11.0, high: 15.0 },
  "유통/커머스": { low: 4.0, median: 6.0, high: 8.0 },
  헬스케어: { low: 6.0, median: 8.0, high: 11.0 },
  기타: { low: 4.0, median: 7.0, high: 9.0 },
};

// KSIC 대분류 -> 산업군 매핑
// KSIC 대분류 코드: A~U
export const KSIC_TO_INDUSTRY: Record<string, IndustryGroup> = {
  // 제조업 (C)
  C: "제조업",
  // IT 서비스 / 정보통신업 (J)
  J: "IT서비스",
  // 도매 및 소매업 (G)
  G: "유통/커머스",
  // 보건업 및 사회복지 서비스업 (Q)
  Q: "헬스케어",
  // 전문, 과학 및 기술 서비스업 (M) - IT서비스로 매핑
  M: "IT서비스",
  // 나머지는 기타
  A: "기타", // 농업, 임업 및 어업
  B: "기타", // 광업
  D: "기타", // 전기, 가스, 증기 및 공기조절 공급업
  E: "기타", // 수도, 하수 및 폐기물 처리, 원료 재생업
  F: "기타", // 건설업
  H: "기타", // 운수 및 창고업
  I: "기타", // 숙박 및 음식점업
  K: "기타", // 금융 및 보험업
  L: "기타", // 부동산업
  N: "기타", // 사업시설 관리, 사업 지원 및 임대 서비스업
  O: "기타", // 공공 행정, 국방 및 사회보장 행정
  P: "기타", // 교육 서비스업
  R: "기타", // 예술, 스포츠 및 여가관련 서비스업
  S: "기타", // 협회 및 단체, 수리 및 기타 개인 서비스업
  T: "기타", // 가구 내 고용활동 및 달리 분류되지 않은 자가소비 생산활동
  U: "기타", // 국제 및 외국기관
};

// 중분류 특수 매핑 (더 정확한 매핑을 위해)
// J58, J62, J63 -> SaaS/플랫폼 (소프트웨어 개발 및 공급업, 컴퓨터 프로그래밍 등)
export const KSIC_SUBCLASS_OVERRIDES: Record<string, IndustryGroup> = {
  "58": "SaaS/플랫폼", // 출판업 (소프트웨어 포함)
  "62": "SaaS/플랫폼", // 컴퓨터 프로그래밍, 시스템 통합 및 관리업
  "63": "SaaS/플랫폼", // 정보서비스업
  "72": "헬스케어", // 연구개발업 중 의약 관련
};

// KSIC 대분류 코드와 명칭
export const KSIC_CATEGORIES: { code: string; name: string }[] = [
  { code: "A", name: "농업, 임업 및 어업" },
  { code: "B", name: "광업" },
  { code: "C", name: "제조업" },
  { code: "D", name: "전기, 가스, 증기 및 공기조절 공급업" },
  { code: "E", name: "수도, 하수 및 폐기물 처리, 원료 재생업" },
  { code: "F", name: "건설업" },
  { code: "G", name: "도매 및 소매업" },
  { code: "H", name: "운수 및 창고업" },
  { code: "I", name: "숙박 및 음식점업" },
  { code: "J", name: "정보통신업" },
  { code: "K", name: "금융 및 보험업" },
  { code: "L", name: "부동산업" },
  { code: "M", name: "전문, 과학 및 기술 서비스업" },
  { code: "N", name: "사업시설 관리, 사업 지원 및 임대 서비스업" },
  { code: "O", name: "공공 행정, 국방 및 사회보장 행정" },
  { code: "P", name: "교육 서비스업" },
  { code: "Q", name: "보건업 및 사회복지 서비스업" },
  { code: "R", name: "예술, 스포츠 및 여가관련 서비스업" },
  { code: "S", name: "협회 및 단체, 수리 및 기타 개인 서비스업" },
  { code: "T", name: "가구 내 고용활동" },
  { code: "U", name: "국제 및 외국기관" },
];

// DLOM 상수 (MVP: 30% 고정)
export const DEFAULT_DLOM = 0.30;

// 멀티플 가중치 (Industry 70%, Peer 30%)
export const WEIGHT_INDUSTRY = 0.70;
export const WEIGHT_PEER = 0.30;

// Peer proxy 배수 (상장사 멀티플 proxy = 산업군 median * 1.2)
export const PEER_PROXY_MULTIPLIER = 1.2;

// 성장률 보정 (새로운 6단계 체계)
export const GROWTH_ADJUSTMENTS = {
  exceptional: { threshold: 12, adj: 0.10 },  // >= 12%: +10% (예외적 고성장)
  high: { threshold: 9, adj: 0.065 },         // 9~12%: +6.5% (중소기업 상위권)
  medium: { threshold: 6, adj: 0.04 },        // 6~9%: +4% (성장 스토리 성립)
  normal: { threshold: 3, adj: 0 },           // 3~6%: 0% (평균적 중소기업)
  stagnant: { threshold: 0, adj: -0.04 },     // 0~3%: -4% (정체/성숙)
  negative: { adj: -0.125 },                  // < 0%: -12.5% (역성장)
};

// 규모(직원 수) 보정
export const SIZE_ADJUSTMENTS: Record<string, number> = {
  "<10": -0.27,
  "10~30": -0.15,
  "30~100": -0.05,
  "100+": 0,
};

// 업력 보정
export const AGE_ADJUSTMENTS = {
  young: { maxAge: 3, adj: -0.07 },     // < 3년: -7%
  medium: { maxAge: 5, adj: -0.03 },    // 3~5년: -3%
  mature: { adj: 0 },                   // >= 5년: 0%
};

// EV Range 스프레드
export const EV_RANGE_SPREAD = {
  normal: { low: 0.90, high: 1.10 },    // 기본: ±10%
  wide: { low: 0.85, high: 1.15 },      // 경고 2개 이상: ±15%
};

// 직원 수 구간 옵션
export const EMPLOYEE_BANDS = [
  { value: "<10", label: "10명 미만" },
  { value: "10~30", label: "10명 ~ 30명" },
  { value: "30~100", label: "30명 ~ 100명" },
  { value: "100+", label: "100명 이상" },
];

// 산업군 직접 선택 옵션
export const INDUSTRY_OPTIONS: { value: IndustryGroup; label: string }[] = [
  { value: "제조업", label: "제조업" },
  { value: "IT서비스", label: "IT 서비스" },
  { value: "SaaS/플랫폼", label: "SaaS / 플랫폼" },
  { value: "유통/커머스", label: "유통 / 커머스" },
  { value: "헬스케어", label: "헬스케어" },
  { value: "기타", label: "기타" },
];
