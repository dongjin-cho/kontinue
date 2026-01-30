# API Contracts (V2)

이 문서는 Kontinue 서비스의 API 엔드포인트, 요청/응답 스키마를 정의합니다.

## 공통 사항

### Base URL

- 개발: `http://localhost:3000`
- 프로덕션: `https://kontinue.xyz` (NEXT_PUBLIC_APP_URL)

### 인증

- Step1/Step2: 게스트 가능 (anon_token 쿠키로 추적)
- Step3/Admin: 로그인 필수 (Supabase Auth)

### 응답 형식

모든 API는 다음 구조를 따릅니다:

```json
{
  "success": true,
  "data": { ... },
  "errors": [{ "field": "...", "message": "..." }]
}
```

---

## Step 1: 기업가치 평가

### POST /api/valuation/step1

EV/EBITDA 기반 상대가치 평가를 수행합니다.

#### Request

```json
{
  "industry_code": "C",
  "industry_group": "제조업",
  "founded_year": 2015,
  "employee_band": "10~30",
  "revenue": 5000000000,
  "ebitda": 800000000,
  "ebitda_type": "EBITDA",
  "net_income": 500000000,
  "revenue_growth": 15,
  "total_debt": 1000000000,
  "cash": 500000000
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "valuation_method": "EV/EBITDA (Relative)",
    "can_evaluate": true,
    "industry_group": "제조업",
    "multiples": {
      "industry_low": 4.0,
      "industry_median": 5.5,
      "industry_high": 7.0,
      "final_low": 3.85,
      "final_median": 5.0,
      "final_high": 6.5
    },
    "adjustments": {
      "growth_adj": 0.07,
      "size_adj": -0.15,
      "age_adj": 0
    },
    "enterprise_value": {
      "range_low": 3200000000,
      "range_high": 4800000000
    },
    "net_debt": 500000000,
    "equity_value": {
      "low": 2700000000,
      "high": 4300000000
    },
    "warnings": [],
    "explain_text": "..."
  }
}
```

---

## Step 2: 현금흐름 시뮬레이션 (V2)

### POST /api/simulate/step2-v2

락인 기간, 지급구조, 조건부 확률을 반영한 시뮬레이션.

#### Request

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
  "discount_rate": 0.12,
  "escrow_schedule_mode": "lump_sum_end",
  "escrow_probability": 0.9,
  "escrow_schedule": null,
  "earnout_schedule_mode": "equal_annual",
  "earnout_schedule": null
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "basis": {
      "equity_basis_value": 5000000000,
      "valuation_basis": "mid",
      "lock_in_years": 3,
      "discount_rate": 0.12,
      "payout": {
        "upfront_pct": 50,
        "escrow_pct": 30,
        "earnout_pct": 20
      }
    },
    "inputs_echo": { ... },
    "scenarios": [
      {
        "equity_pct": 100,
        "total_proceeds": 5000000000,
        "cases": {
          "guaranteed": {
            "cashflows": [2500000000, 0, 0, 0],
            "total_nominal": 2500000000,
            "pv": 2500000000,
            "kpis": {
              "immediate_amount": 2500000000,
              "final_amount": 0,
              "pv_to_total_ratio": 1.0
            }
          },
          "expected": {
            "cashflows": [2500000000, 200000000, 200000000, 1550000000],
            "total_nominal": 4450000000,
            "pv": 4012000000,
            "kpis": {
              "immediate_amount": 2500000000,
              "final_amount": 1550000000,
              "pv_to_total_ratio": 0.902
            }
          },
          "best": {
            "cashflows": [2500000000, 333333333, 333333333, 1833333334],
            "total_nominal": 5000000000,
            "pv": 4520000000,
            "kpis": {
              "immediate_amount": 2500000000,
              "final_amount": 1833333334,
              "pv_to_total_ratio": 0.904
            }
          }
        }
      }
    ],
    "warnings": [],
    "explain_text": "..."
  }
}
```

---

## Step 3: 문서 파싱

### POST /api/document/parse

문서 파싱을 외부 서비스(MAKE)에 요청합니다.

#### Request

```json
{
  "documentId": "uuid"
}
```

#### Response

```json
{
  "success": true,
  "message": "Parsing request sent",
  "documentId": "uuid"
}
```

---

### POST /api/webhook/document-parsed

외부 파서로부터 파싱 결과를 수신합니다.

#### Request (from external parser)

**레거시 형식:**
```json
{
  "documentId": "uuid",
  "status": "parsed",
  "extracted": {
    "revenue": 5000000000,
    "operating_income": 800000000,
    "net_income": 500000000,
    "assets": 10000000000,
    "liabilities": 3000000000,
    "cash": 500000000,
    "total_debt": 1000000000
  }
}
```

**kr-fin-v1 형식:**
```json
{
  "documentId": "uuid",
  "status": "parsed",
  "extracted": {
    "schema_version": "kr-fin-v1",
    "meta": {
      "company_name": "ABC 주식회사",
      "source_type": "pdf",
      "currency": "KRW",
      "unit_label": "백만원",
      "unit_multiplier": 1000000,
      "fiscal_year_end_month": 12
    },
    "periods": [
      {
        "period_id": "FY2024",
        "label": "2024년",
        "type": "FY",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31"
      }
    ],
    "statements": {
      "income_statement": {
        "FY2024": {
          "revenue": 5000,
          "operating_income": 800,
          "net_income": 500
        }
      },
      "balance_sheet": {
        "FY2024": {
          "assets_total": 10000,
          "liabilities_total": 3000,
          "cash_and_equivalents": 500,
          "borrowings_short": 200,
          "borrowings_long": 800
        }
      }
    }
  }
}
```

#### Response

```json
{
  "success": true
}
```

---

### POST /api/document/verify

사용자가 검증한 재무 데이터를 저장합니다.

#### Request

```json
{
  "documentId": "uuid",
  "verified": { ... },
  "selectedPeriodId": "FY2024"
}
```

#### Response

```json
{
  "success": true,
  "message": "Document verified successfully",
  "documentId": "uuid"
}
```

---

## 리드 제출

### POST /api/lead/submit

중개법인 연결 리드를 생성하고 전송합니다.

#### Request

```json
{
  "documentId": "uuid",
  "consent": true,
  "contact": {
    "name": "홍길동",
    "email": "hong@example.com",
    "phone": "010-1234-5678",
    "message": "문의드립니다"
  },
  "step1": { ... },
  "step2": { ... }
}
```

#### Response

```json
{
  "success": true,
  "message": "Lead submitted successfully",
  "leadId": "uuid"
}
```

---

## Admin API

### GET /api/admin/export

CSV 파일 내보내기. Admin 권한 필요.

#### Query Parameters

| Parameter | Required | Values |
|-----------|----------|--------|
| type | Yes | `runs`, `leads`, `documents` |

#### Response

Content-Type: `text/csv`

---

## 에러 코드

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad Request - 입력 검증 실패 |
| 401 | Unauthorized - 인증 필요 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스 없음 |
| 500 | Server Error - 서버 오류 |

---

## 스키마 버전

| Version | Description |
|---------|-------------|
| kr-fin-v1 | 국문 재무제표 표준 스키마 |
