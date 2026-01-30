# 딜 구조 시나리오 기능 문서

## 개요

Step2에 추가된 "딜 구조 시나리오" 기능은 창업자가 실제로 손에 쥐게 되는 금액을 5가지 딜 구조별로 비교 분석합니다.

## 접근 경로

- **URL**: `/app/step2` → "딜 구조 시나리오" 탭
- **전제조건**: Step1 기업가치 평가 완료 필요

---

## 5가지 딜 시나리오

### 1. ALL_CASH_CONTROL (전액 현금 인수)

**적합성 조건:**
- 매각 희망: "전량"
- 창업자 지분: 50% 이상

**가정:**
- 매각 비율: 100%
- 대가 구성: 현금 100%

**특징:**
- 즉시 전액 현금 확보
- 미래 리스크 없음
- 구조가 단순하여 협상 용이

---

### 2. PARTIAL_EXIT_ROLLOVER (부분 매각 + 롤오버)

**적합성 조건:**
- 매각 희망: "일부"
- 창업자 지분: 30% 이상
- 매출 성장률: 10% 이상

**가정:**
- 매각 비율: 65% (range: 60~70%)
- 롤오버 비율: 35% (range: 30~40%)

**특징:**
- 즉시 현금 + 미래 업사이드 동시 확보
- 경영 지속 참여 가능
- 롤오버 지분 가치 불확실성 존재

---

### 3. PERFORMANCE_EARNOUT (성과 연동 어닝아웃)

**적합성 조건:**
- 매출 성장률: 15% 이상
- EBITDA 추이: "변동"

**가정:**
- 기본 지급 비율: 75% (range: 70~80%)
- 어닝아웃 비율: 25% (range: 20~30%)
- 어닝아웃 기간: 2년
- 달성 확률: 50% (사용자 조정 가능)

**특징:**
- 매수자와 가치 평가 갭 해소
- 성과 달성 시 높은 총 대가
- 어닝아웃 조건 협상 복잡성

---

### 4. CASH_AND_STOCK (현금 + 주식 혼합)

**적합성 조건:**
- 기업 소개에 "시너지" 키워드 포함, 또는
- 매출 성장률: 15% 이상

**가정:**
- 현금 비율: 60% (range: 50~70%)
- 주식 비율: 40% (range: 30~50%)
- 주식 락업: 1년
- 주식 할인: 10% (비상장/락업 리스크)

**특징:**
- 인수자 주식 상승 시 추가 이익
- 절세 효과 가능
- 주식 가치 변동 리스크

---

### 5. ASSET_DEAL (자산 양수도)

**적합성 조건:**
- 매각 희망: "전량" 이 아님
- 기업 소개에 "사업부" 키워드 포함

**가정:**
- 자산 기여율: 50% (range: 30~70%)

**특징:**
- 특정 사업부만 분리 매각 가능
- 법인으로 현금 유입
- 창업자 직접 현금 수령 불가 (배당/감자/청산 필요)

---

## 계산 공식

### 기본 계산

```
Equity_Value_Median = (equityValueLow + equityValueHigh) / 2
Founder_Gross = GrossDealValue * Founder_Share
Founder_Fee = Founder_Gross * Fee_Rate
Founder_Tax = (Founder_Gross - Founder_Fee) * Tax_Rate (옵션)
Founder_Net = Founder_Gross - Founder_Fee - Founder_Tax
```

### 수령액 분해

| 구분 | 설명 |
|------|------|
| immediate_cash | 거래 즉시 수령하는 현금 |
| deferred_cash | 에스크로 등 시간 확정 지연 현금 |
| conditional_cash | 어닝아웃 등 조건부 현금 (기대값) |
| stock_value | 주식 평가액 (할인 적용 후) |
| retained_value | 롤오버 보유 지분 가치 (참고) |

---

## Top 3 추천 로직

### 점수 매트릭스

| 시나리오 | CashNow | Upside | Risk |
|----------|---------|--------|------|
| ALL_CASH_CONTROL | 5 | 0 | 5 |
| PARTIAL_EXIT_ROLLOVER | 3 | 5 | 3 |
| PERFORMANCE_EARNOUT | 2 | 4 | 1 |
| CASH_AND_STOCK | 2 | 4 | 2 |
| ASSET_DEAL | 1 | 2 | 1 |

### Founder Fit 가중치

```
if 매각희망 == "전량":
  ALL_CASH_CONTROL +2
  PARTIAL_EXIT_ROLLOVER -1

if 매각희망 == "일부":
  PARTIAL_EXIT_ROLLOVER +2
  ALL_CASH_CONTROL -1

if 매출성장률 >= 15%:
  PARTIAL_EXIT_ROLLOVER +1
  PERFORMANCE_EARNOUT +1
  CASH_AND_STOCK +1

if EBITDA추이 == "변동":
  PERFORMANCE_EARNOUT +1

적합하지 않은 시나리오: -10점
```

### 총점 계산

```
Total_Score = CashNow + Upside + Risk + FounderFit
```

---

## API

### POST /api/deal-scenarios/generate

**Request:**
```json
{
  "equityValueLow": 5000000000,
  "equityValueHigh": 8000000000,
  "capTable": {
    "founderShare": 60,
    "investorShare": 30,
    "optionPool": 10
  },
  "hopeToSell": "전량",
  "revenueGrowth": 15,
  "ebitdaTrend": "상승",
  "companyProfile": "시너지 효과 기대",
  "feeRate": 0.03,
  "taxRate": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "baseEquityMedian": 6500000000,
    "scenarios": [...],
    "top3": ["ALL_CASH_CONTROL", "CASH_AND_STOCK", "PARTIAL_EXIT_ROLLOVER"],
    "scoring": {...},
    "warnings": []
  }
}
```

---

## 파일 구조

```
src/
├── lib/deal/
│   └── scenarios.ts           # 순수 계산/추천 로직
├── app/api/deal-scenarios/
│   └── generate/route.ts      # API 라우트
├── components/deal/
│   ├── DealScenarioForm.tsx   # 입력 폼
│   └── DealScenarioResults.tsx # 결과 표시 + 차트
├── app/app/step2/page.tsx     # Tab 구조 페이지
└── app/admin/scenarios/       # Admin 시나리오 관리
```

---

## 저장소

### localStorage
- `sme_deal_scenarios_draft_v1`: 입력 폼 임시 저장
- `sme_deal_scenarios_result_v1`: 결과 저장

### Database (simulation_runs)
- `deal_scenarios_input`: 입력 데이터 (JSONB)
- `deal_scenarios_result`: 결과 데이터 (JSONB)
- `deal_scenarios_completed_at`: 생성 시점

---

## 주의사항

1. **세금 계산**: 본 시뮬레이션의 세금 계산은 단순화된 가정입니다. 실제 양도소득세는 개인 상황, 지분 형태, 특례 적용 여부에 따라 크게 달라집니다.

2. **수수료**: 자문 수수료율은 거래 규모, 복잡도, 자문사에 따라 다릅니다. 기본값 3%는 일반적인 참고치입니다.

3. **어닝아웃 확률**: 어닝아웃 달성 확률은 사용자가 조정 가능하며, 실제 달성률은 산업/기업/경제 상황에 따라 다릅니다.

4. **주식 가치**: 비상장 주식의 가치 평가는 불확실성이 높습니다. 10% 할인은 일반적인 가정이며 실제로는 더 높거나 낮을 수 있습니다.

---

## 향후 확장 포인트

1. **세금 정밀화**: 양도소득세 특례, 법인세 영향, 배당소득세 등
2. **우선주 처리**: 투자자 우선주 청산 우선권 반영
3. **청산 시나리오**: ASSET_DEAL 후 법인 청산 시뮬레이션
4. **시장 데이터 연동**: 실제 M&A 거래 통계 기반 가정값 업데이트
5. **민감도 분석**: 가정값 변화에 따른 결과 변동 시각화
