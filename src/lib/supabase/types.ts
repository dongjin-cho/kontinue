/**
 * Supabase Database Types
 */

export type DocumentStatus = 'uploaded' | 'parsing' | 'parsed' | 'verified' | 'failed';
export type LeadSentStatus = 'pending' | 'sent' | 'failed';

export interface Document {
  id: string;
  user_id: string;
  run_id: string | null;
  file_path: string;
  file_name: string;
  mime_type: string;
  status: DocumentStatus;
  schema_version?: string;
  extracted_json: ExtractedFinancials | Record<string, unknown> | null;
  verified_json: ExtractedFinancials | Record<string, unknown> | null;
  selected_period_id?: string | null;
  normalized_summary?: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  user_id: string;
  document_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  contact_message: string | null;
  consent_given: boolean;
  consent_given_at: string | null;
  step1_summary: Record<string, unknown> | null;
  step2_summary: Record<string, unknown> | null;
  financial_summary: ExtractedFinancials | null;
  broker_payload: Record<string, unknown> | null;
  sent_status: LeadSentStatus;
  sent_at: string | null;
  send_error: string | null;
  created_at: string;
  updated_at: string;
}

// 추출된 재무 데이터 구조
export interface ExtractedFinancials {
  revenue?: number;           // 매출액
  gross_profit?: number;      // 매출총이익
  operating_income?: number;  // 영업이익
  ebitda?: number;            // EBITDA
  net_income?: number;        // 순이익
  assets?: number;            // 총자산
  liabilities?: number;       // 총부채
  cash?: number;              // 현금 및 현금성 자산
  total_debt?: number;        // 총 차입금
  fiscal_year?: number;       // 회계연도
  currency?: string;          // 통화 (기본: KRW)
}

// 파싱 웹훅 요청
export interface ParseWebhookRequest {
  documentId: string;
  userId: string;
  filePath: string;
  signedUrl: string;
  fileName: string;
  mimeType: string;
  callbackUrl: string;
}

// 파싱 콜백 응답
export interface ParseCallbackPayload {
  documentId: string;
  status: 'parsed' | 'failed';
  extracted?: ExtractedFinancials;
  error?: string;
}

// 리드 제출 요청
export interface LeadSubmitRequest {
  documentId?: string;
  consent: boolean;
  contact: {
    name: string;
    email: string;
    phone?: string;
    message?: string;
  };
  step1?: Record<string, unknown>;
  step2?: Record<string, unknown>;
}

// 브로커 웹훅 페이로드
export interface BrokerWebhookPayload {
  leadId: string;
  contact: {
    name: string;
    email: string;
    phone?: string;
    message?: string;
  };
  valuationSummary?: {
    industryGroup?: string;
    equityValueLow?: number;
    equityValueHigh?: number;
    enterpriseValueLow?: number;
    enterpriseValueHigh?: number;
    multipleMedian?: number;
  };
  simulationSummary?: {
    lockInYears?: number;
    selectedEquityPct?: number;
    totalProceeds?: number;
    presentValue?: number;
  };
  financialSummary?: ExtractedFinancials;
  documentUrl?: string;
  createdAt: string;
}
