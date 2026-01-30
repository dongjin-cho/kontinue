# Kontinue - SME 기업가치 평가 서비스

SME(중소기업) 사장님을 위한 약식 기업가치 평가 서비스입니다.
최소한의 정보만으로 EV/EBITDA 멀티플 기반 상대가치 평가를 수행합니다.

## 주요 기능

### Step 1: 약식 기업가치 평가 (현재 제공)
- **EV/EBITDA 멀티플 기반 상대가치 평가**
- **산업군별 멀티플 적용** (제조업, IT서비스, SaaS/플랫폼, 유통/커머스, 헬스케어, 기타)
- **DLOM(비유동성 할인) 반영** (기본 30%)
- **기업 특성 보정**
  - 성장률 보정: 성장률에 따른 가치 조정
  - 규모 보정: 직원 수 기준 조정
  - 업력 보정: 설립연도 기반 조정
- **결과 Range 제공** (단일값 아닌 범위)
- **결과 설명문 제공** (왜 이런 결과가 나왔는지 한국어 설명)

### Step 2: 현금흐름 시뮬레이션 V2 (현재 제공)
- **Lock-in 기간 설정** (1/3/5년)
- **지분 시나리오 비교** (복수 시나리오 지원, 1~10개)
- **지급 구조 설정** (Upfront / Escrow / Earn-out)
- **현실화된 지급구조**:
  - Escrow 분할 지급 (종료 일괄 / 연차별 균등 / 커스텀)
  - Earnout 연차별 달성확률 설정
  - 조건부 지급 확률 반영
- **3가지 케이스 제공**:
  - Guaranteed: 확정분(즉시지급)만
  - Expected: 확률 반영 기대값
  - Best: 100% 달성 가정
- **현재가치(PV) 계산** (할인율 8~20%)
- **연도별 현금흐름 시각화**
- **시나리오별 × 케이스별 비교 표 및 차트**

### Step 3: 재무제표 분석 및 중개법인 연결 (현재 제공)
- **로그인 필수** (Magic Link 인증)
- **재무제표 업로드** (PDF, 이미지, Excel)
- **외부 파싱 서비스 연동** (MAKE Webhook)
- **국문 재무제표 스키마 (kr-fin-v1)**: 손익계산서/재무상태표/현금흐름표
- **기간별 탭 표시** 및 섹션 아코디언
- **추출값 검증/수정** 폼
- **중개법인 연결 CTA** (리드 생성 및 전송)

### Admin 페이지 (관리자 전용)
- **RBAC 기반 접근 제어** (ADMIN_EMAILS 환경변수)
- **Dashboard**: KPI 통계 (런, 문서, 리드)
- **Runs 관리**: 시뮬레이션 목록/상세 조회
- **Documents 관리**: 문서 목록/상세 조회
- **Leads 관리**: 리드 목록/상세 조회
- **CSV 내보내기**: 데이터 다운로드

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Validation**: Zod
- **Charts**: Recharts
- **Auth & Database**: Supabase
- **State**: React Hooks + localStorage

## 시작하기

### 요구사항

- Node.js 18 이상
- npm 또는 yarn

### 환경 변수 설정

`.env.example`을 `.env.local`로 복사하고 값을 설정하세요:

```bash
cp .env.example .env.local
```

필수 환경 변수:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Role Key (서버용)
- `NEXT_PUBLIC_APP_URL`: 앱 URL (도메인 설정 시)
- `MAKE_WEBHOOK_URL`: MAKE 파싱 웹훅 URL
- `BROKER_WEBHOOK_URL`: (선택) 브로커 웹훅 URL
- `WEBHOOK_SECRET`: (선택) 웹훅 검증 시크릿
- `ADMIN_EMAILS`: (선택) 관리자 이메일 목록 (콤마 구분)

### 설치

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── valuation/
│   │   │   └── step1/
│   │   │       └── route.ts      # Step1 API 핸들러
│   │   └── simulate/
│   │       └── step2/
│   │           └── route.ts      # Step2 API 핸들러
│   ├── app/
│   │   ├── step1/
│   │   │   └── page.tsx          # Step1 페이지
│   │   ├── step2/
│   │   │   └── page.tsx          # Step2 페이지
│   │   └── step3/
│   │       └── page.tsx          # Step3 페이지 (로그인 필수)
│   ├── login/
│   │   └── page.tsx              # 로그인 페이지
│   ├── auth/
│   │   └── callback/route.ts     # 인증 콜백
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # 랜딩 페이지
├── components/
│   ├── step1/
│   │   ├── CurrencyInput.tsx     # 통화 입력 컴포넌트
│   │   ├── IndustrySelect.tsx    # 산업 선택 컴포넌트
│   │   ├── Step1Form.tsx         # Step1 입력 폼
│   │   └── ValuationResult.tsx   # 결과 표시 컴포넌트
│   ├── step2/
│   │   ├── Step2Form.tsx         # Step2 입력 폼
│   │   └── Step2Result.tsx       # Step2 결과 (KPI/표/차트)
│   ├── step3/
│   │   ├── UploadPanel.tsx       # 파일 업로드
│   │   ├── ExtractedForm.tsx     # 추출값 검증/수정
│   │   ├── CTAForm.tsx           # 중개법인 연결 CTA
│   │   └── StepProgress.tsx      # 진행 단계 표시
│   └── ui/                       # shadcn/ui 컴포넌트들
├── lib/
│   ├── hooks/
│   │   └── useLocalStorage.ts    # localStorage 훅
│   ├── simulations/
│   │   ├── step2.ts              # Step2 시뮬레이션 로직 (레거시)
│   │   ├── step2_v2.ts           # Step2 V2 시뮬레이션 로직
│   │   ├── types.ts              # Step2 타입 정의 (레거시)
│   │   └── types_v2.ts           # Step2 V2 타입 정의
│   ├── supabase/
│   │   ├── admin.ts              # Admin 클라이언트
│   │   ├── client.ts             # 브라우저 클라이언트
│   │   ├── server.ts             # 서버 클라이언트
│   │   ├── middleware.ts         # 인증 미들웨어
│   │   ├── types.ts              # DB 타입 정의
│   │   ├── financial-schema.ts   # 국문 재무제표 스키마
│   │   └── webhook-mapper.ts     # 웹훅 응답 매핑
│   ├── valuation/
│   │   ├── constants.ts          # 상수 및 멀티플 테이블
│   │   ├── formatter.ts          # 숫자 포맷팅 유틸
│   │   ├── step1.ts              # Step1 평가 로직
│   │   └── types.ts              # 타입 정의
│   └── utils.ts                  # 유틸리티 함수
```

## 평가 로직

### 멀티플 적용 방식

1. **산업군 멀티플**: KSIC 코드 → 산업군 매핑 → 해당 산업 멀티플 적용
2. **Peer 멀티플**: 산업군 median × 1.2 (상장사 proxy)
3. **DLOM 적용**: Peer 멀티플에 30% 할인 적용
4. **가중 평균**: Industry 70% + Peer(DLOM 적용) 30%

### 기업 특성 보정

| 구분 | 조건 | 보정률 |
|------|------|--------|
| 성장률 | ≥20% | +15% |
| 성장률 | 10~20% | +7% |
| 성장률 | 0~10% | 0% |
| 성장률 | <0% | -15% |
| 규모 | <10명 | -27% |
| 규모 | 10~30명 | -15% |
| 규모 | 30~100명 | -5% |
| 규모 | 100명+ | 0% |
| 업력 | <3년 | -7% |
| 업력 | 3~5년 | -3% |
| 업력 | ≥5년 | 0% |

### EV Range

- 기본: ±10% (mid × 0.9 ~ mid × 1.1)
- 입력 정합성 경고 2개 이상: ±15%

### Equity Value

```
Equity Value = Enterprise Value - Net Debt
Net Debt = Total Debt - Cash
```

## API

### POST /api/valuation/step1

**Request Body:**
```json
{
  "industryCode": "C",
  "industryGroup": "제조업",
  "foundedYear": 2015,
  "employeeBand": "10~30",
  "revenue": 5000000000,
  "ebitda": 800000000,
  "ebitdaType": "EBITDA",
  "netIncome": 500000000,
  "revenueGrowth": 15,
  "totalDebt": 1000000000,
  "cash": 500000000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valuationMethod": "EV/EBITDA (Relative)",
    "canEvaluate": true,
    "industryGroup": "제조업",
    "multiples": { ... },
    "adjustments": { ... },
    "enterpriseValue": {
      "rangeLow": ...,
      "rangeHigh": ...
    },
    "equityValue": {
      "low": ...,
      "high": ...
    },
    "explainText": "..."
  }
}
```

## Step2 시뮬레이션 로직

### 현금흐름 모델

- **t=0**: Upfront (즉시 지급)
- **t=1..N-1**: Earn-out 균등 분할
- **t=N**: Earn-out 마지막 분할 + Escrow 일괄

### 현재가치(PV) 계산

```
PV = Σ(t=0..N) cashflow[t] / (1 + discount_rate)^t
```

### API

#### POST /api/simulate/step2

**Request Body:**
```json
{
  "equity_basis_value": 5000000000,
  "valuation_basis": "mid",
  "lock_in_years": 3,
  "equity_scenarios": [20, 50, 80, 100],
  "payout": {
    "upfront_pct": 50,
    "escrow_pct": 30,
    "earnout_pct": 20
  },
  "discount_rate": 0.12
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "basis": { ... },
    "scenarios": [
      {
        "equity_pct": 100,
        "total_proceeds": 5000000000,
        "pv": 4500000000,
        "cashflows": [...],
        "kpis": { ... }
      }
    ],
    "warnings": [...],
    "explain_text": "..."
  }
}
```

## Step3 재무제표 파싱 플로우

### 업로드 → 파싱 → 검증 → 리드 전송

1. **파일 업로드**: Supabase Storage에 업로드 → `documents` 테이블에 레코드 생성
2. **파싱 요청**: `/api/document/parse` → MAKE_WEBHOOK_URL로 파싱 요청
3. **파싱 콜백**: `/api/webhook/document-parsed` → 추출 결과 저장
4. **검증/수정**: 사용자가 추출값 확인 → `/api/document/verify` → verified_json 저장
5. **리드 제출**: `/api/lead/submit` → BROKER_WEBHOOK_URL로 전송 (선택)

### API

#### POST /api/document/parse

문서 파싱 요청을 MAKE 웹훅으로 전송합니다.

**Request:** `{ "documentId": "uuid" }`

#### POST /api/webhook/document-parsed

외부 파서로부터 파싱 결과를 수신합니다.

**Request:**
```json
{
  "documentId": "uuid",
  "status": "parsed" | "failed",
  "extracted": {
    "revenue": 5000000000,
    "ebitda": 800000000,
    ...
  },
  "error": "..." 
}
```

#### POST /api/document/verify

사용자가 검증한 데이터를 저장합니다.

**Request:** `{ "documentId": "uuid", "verified": { ... } }`

#### POST /api/lead/submit

중개법인 연결 리드를 생성하고 전송합니다.

**Request:**
```json
{
  "documentId": "uuid",
  "consent": true,
  "contact": {
    "name": "홍길동",
    "email": "hong@example.com",
    "phone": "010-1234-5678",
    "message": "..."
  },
  "step1": { ... },
  "step2": { ... }
}
```

## 테스트 시나리오 (End-to-End)

### 파싱 콜백 테스트 (curl)

파싱 콜백을 수동으로 테스트할 수 있습니다:

```bash
# 파싱 성공 콜백
curl -X POST http://localhost:3000/api/webhook/document-parsed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -d '{
    "documentId": "your-document-uuid",
    "status": "parsed",
    "extracted": {
      "revenue": 5000000000,
      "ebitda": 800000000,
      "net_income": 500000000,
      "assets": 10000000000,
      "liabilities": 3000000000,
      "cash": 500000000,
      "total_debt": 1000000000
    }
  }'

# 파싱 실패 콜백
curl -X POST http://localhost:3000/api/webhook/document-parsed \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "your-document-uuid",
    "status": "failed",
    "error": "Cannot parse document"
  }'
```

## Supabase 설정

### 마이그레이션

`supabase/migrations/` 폴더의 SQL 파일을 Supabase Dashboard에서 실행하세요:

1. `documents` 테이블 생성
2. `leads` 테이블 생성
3. RLS 정책 설정
4. Storage 버킷 `documents` 생성 (private)

### Storage 정책

Storage에서 `documents` 버킷을 생성하고 다음 정책을 설정하세요:

- **INSERT**: `(bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])`
- **SELECT**: `(bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])`
- **DELETE**: `(bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])`

## localStorage 키

- `sme_step1_draft`: Step1 입력값 임시 저장
- `sme_step1_result`: Step1 평가 결과 저장
- `sme_step2_draft_v2`: Step2 V2 입력값 임시 저장
- `sme_step2_result_v2`: Step2 V2 시뮬레이션 결과 저장

## 도메인 설정

도메인 연결 가이드는 [docs/DOMAIN_SETUP.md](docs/DOMAIN_SETUP.md) 참조.

## API 문서

API 엔드포인트 및 스키마는 [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) 참조.

## 라이선스

© 2026 Kontinue. All rights reserved.

---

**주의사항**: 본 서비스는 참고용 정보 제공을 목적으로 하며, 투자 또는 거래 의사결정의 근거로 사용될 수 없습니다. 실제 M&A 거래 시에는 반드시 전문가의 정밀 실사(Due Diligence)가 필요합니다.
