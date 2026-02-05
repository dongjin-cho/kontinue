"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Calculator,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Users,
  TrendingUp,
} from "lucide-react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { Step1Result } from "@/lib/valuation/types";
import type { Step2V2Result } from "@/lib/simulations/types_v2";
import type { DealScenarioOutput, HopeToSell, EbitdaTrend } from "@/lib/deal/scenarios";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";
import type { CaseResult } from "@/lib/simulations/types_v2";

// API 응답의 case 객체를 camelCase로 변환
function transformCase(c: Record<string, unknown>): CaseResult {
  const kpis = c.kpis as Record<string, unknown>;
  return {
    cashflows: c.cashflows as number[],
    totalNominal: c.total_nominal as number,
    pv: c.pv as number,
    kpis: {
      immediateAmount: kpis.immediate_amount as number,
      finalAmount: kpis.final_amount as number,
      pvToTotalRatio: kpis.pv_to_total_ratio as number,
    },
  };
}

interface Step2UnifiedFormProps {
  step1Result: Step1Result;
  onCashflowResult: (result: Step2V2Result) => void;
  onDealResult: (result: DealScenarioOutput) => void;
}

interface FormData {
  // 현금흐름 분석
  valuationBasis: "low" | "mid" | "high";
  lockInYears: 1 | 3 | 5;
  equityPct: number;
  discountRate: number;

  // 딜 시나리오 - Cap Table
  founderShare: number;
  investorShare: number;
  optionPool: number;

  // 딜 시나리오 - 거래 전제
  hopeToSell: HopeToSell;
  expectedExitDate: string;

  // 딜 시나리오 - 보조 정보
  revenueGrowth: number;
  ebitdaTrend: EbitdaTrend;
  companyProfile: string;

  // 수수료/세금
  feeRate: number;
  taxRate: number;
  applyTax: boolean;
  earnoutProbability: number;
}

const initialFormData: FormData = {
  valuationBasis: "mid",
  lockInYears: 3,
  equityPct: 100,
  discountRate: 12,
  founderShare: 60,
  investorShare: 30,
  optionPool: 10,
  hopeToSell: "전량",
  expectedExitDate: "",
  revenueGrowth: 10,
  ebitdaTrend: "보합",
  companyProfile: "",
  feeRate: 3,
  taxRate: 22,
  applyTax: false,
  earnoutProbability: 50,
};

export function Step2UnifiedForm({
  step1Result,
  onCashflowResult,
  onDealResult,
}: Step2UnifiedFormProps) {
  const { value: savedData, setValue: saveData } = useLocalStorage<FormData>(
    "sme_step2_unified_draft",
    initialFormData
  );

  const [formData, setFormData] = React.useState<FormData>(savedData || initialFormData);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Step1 결과에서 revenueGrowth 가져오기
  React.useEffect(() => {
    if (step1Result?.inputs?.revenueGrowth !== undefined) {
      setFormData((prev) => ({
        ...prev,
        revenueGrowth: step1Result.inputs.revenueGrowth,
      }));
    }
  }, [step1Result]);

  // 저장
  React.useEffect(() => {
    saveData(formData);
  }, [formData, saveData]);

  const capTableSum = formData.founderShare + formData.investorShare + formData.optionPool;
  const isCapTableValid = Math.abs(capTableSum - 100) < 0.01;

  const getEquityBasisValue = () => {
    switch (formData.valuationBasis) {
      case "low":
        return step1Result.equityValue.low;
      case "high":
        return step1Result.equityValue.high;
      default:
        return (step1Result.equityValue.low + step1Result.equityValue.high) / 2;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isCapTableValid) {
      setError(`Cap Table 합계가 100%여야 합니다. (현재: ${capTableSum.toFixed(1)}%)`);
      return;
    }

    setIsLoading(true);

    try {
      // 1. 현금흐름 분석 API 호출
      const cashflowResponse = await fetch("/api/simulate/step2-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equity_basis_value: getEquityBasisValue(),
          valuation_basis: formData.valuationBasis,
          lock_in_years: formData.lockInYears,
          equity_scenarios: [formData.equityPct],
          payout: {
            upfront_pct: 100,
            escrow_pct: 0,
            earnout_pct: 0,
          },
          discount_rate: formData.discountRate / 100,
          escrow_schedule_mode: "lump_sum_end",
          escrow_probability: 1.0,
          earnout_schedule_mode: "equal_annual",
        }),
      });

      const cashflowData = await cashflowResponse.json();

      if (!cashflowData.success) {
        throw new Error(cashflowData.error || "현금흐름 분석 중 오류가 발생했습니다.");
      }

      // API 응답을 camelCase로 변환
      const apiData = cashflowData.data;
      const transformedCashflowResult: Step2V2Result = {
        basis: {
          equityBasisValue: apiData.basis.equity_basis_value,
          valuationBasis: apiData.basis.valuation_basis,
          lockInYears: apiData.basis.lock_in_years,
          discountRate: apiData.basis.discount_rate,
          payout: {
            upfrontPct: apiData.basis.payout.upfront_pct,
            escrowPct: apiData.basis.payout.escrow_pct,
            earnoutPct: apiData.basis.payout.earnout_pct,
          },
        },
        inputsEcho: {
          equityBasisValue: apiData.inputs_echo.equity_basis_value,
          valuationBasis: apiData.inputs_echo.valuation_basis,
          lockInYears: apiData.inputs_echo.lock_in_years,
          equityScenarios: apiData.inputs_echo.equity_scenarios,
          discountRate: apiData.inputs_echo.discount_rate,
          payout: {
            upfrontPct: apiData.inputs_echo.payout.upfront_pct,
            escrowPct: apiData.inputs_echo.payout.escrow_pct,
            earnoutPct: apiData.inputs_echo.payout.earnout_pct,
          },
          escrowScheduleMode: apiData.inputs_echo.escrow_schedule_mode,
          escrowProbability: apiData.inputs_echo.escrow_probability,
          earnoutScheduleMode: apiData.inputs_echo.earnout_schedule_mode,
        },
        scenarios: apiData.scenarios.map((s: Record<string, unknown>) => ({
          equityPct: s.equity_pct,
          totalProceeds: s.total_proceeds,
          cases: {
            guaranteed: transformCase((s.cases as Record<string, unknown>).guaranteed as Record<string, unknown>),
            expected: transformCase((s.cases as Record<string, unknown>).expected as Record<string, unknown>),
            best: transformCase((s.cases as Record<string, unknown>).best as Record<string, unknown>),
          },
        })),
        warnings: apiData.warnings || [],
        explainText: apiData.explain_text || "",
      };

      // 현금흐름 결과 콜백
      onCashflowResult(transformedCashflowResult);

      // 2. 딜 시나리오 API 호출
      const equityMedian = (step1Result.equityValue.low + step1Result.equityValue.high) / 2;
      
      const dealResponse = await fetch("/api/deal-scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equityValueLow: step1Result.equityValue.low,
          equityValueHigh: step1Result.equityValue.high,
          equityValueMedian: equityMedian,
          capTable: {
            founderShare: formData.founderShare,
            investorShare: formData.investorShare,
            optionPool: formData.optionPool,
          },
          hopeToSell: formData.hopeToSell,
          expectedExitDate: formData.expectedExitDate || undefined,
          secondaryRatio: 100,
          primaryIssue: false,
          revenueGrowth: formData.revenueGrowth,
          ebitdaTrend: formData.ebitdaTrend,
          companyProfile: formData.companyProfile,
          escrowAssumption: 0,
          earnoutProbability: formData.earnoutProbability / 100,
          feeRate: formData.feeRate / 100,
          taxRate: formData.applyTax ? formData.taxRate / 100 : 0,
        }),
      });

      const dealData = await dealResponse.json();

      if (!dealData.success) {
        throw new Error(dealData.error || "딜 시나리오 생성 중 오류가 발생했습니다.");
      }

      // 딜 시나리오 결과 콜백
      onDealResult(dealData.data);

      // 서버에 저장 (non-blocking)
      fetch("/api/runs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "step2_unified",
          input: formData,
          result: { cashflow: cashflowData.data, deal: dealData.data },
        }),
      }).catch((err) => console.warn("Failed to save run:", err));

    } catch (err) {
      console.error("Form submission error:", err);
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="border-slate-200 bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Calculator className="h-5 w-5 text-slate-600" />
          현금흐름 및 딜구조 시나리오
        </CardTitle>
        <CardDescription className="text-slate-500">
          거래 조건을 입력하시면 예상 수령액과 다양한 딜 구조 시나리오를 분석해 드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 섹션 1: 거래 기본 조건 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Briefcase className="h-4 w-4 text-slate-500" />
              <h3 className="font-medium text-sm text-slate-700">거래 기본 조건</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 기업가치 기준 */}
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">
                  기업가치 기준
                  <InfoTooltip term="기업가치" />
                </Label>
                <RadioGroup
                  value={formData.valuationBasis}
                  onValueChange={(v) => updateField("valuationBasis", v as "low" | "mid" | "high")}
                  className="flex gap-2"
                >
                  {[
                    { value: "low", label: "보수적", amount: step1Result.equityValue.low },
                    { value: "mid", label: "중간", amount: (step1Result.equityValue.low + step1Result.equityValue.high) / 2 },
                    { value: "high", label: "적극적", amount: step1Result.equityValue.high },
                  ].map((opt) => (
                    <div key={opt.value} className="flex items-center">
                      <RadioGroupItem value={opt.value} id={`basis-${opt.value}`} className="peer sr-only" />
                      <Label
                        htmlFor={`basis-${opt.value}`}
                        className={cn(
                          "flex flex-col items-center cursor-pointer px-3 py-2 rounded-lg border text-xs",
                          "hover:bg-slate-50 hover:border-slate-300",
                          "peer-data-[state=checked]:border-slate-800 peer-data-[state=checked]:bg-slate-50"
                        )}
                      >
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-slate-400">{formatKRWBillions(opt.amount)}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* 매각 희망 */}
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">
                  매각 희망 범위
                </Label>
                <RadioGroup
                  value={formData.hopeToSell}
                  onValueChange={(v) => updateField("hopeToSell", v as HopeToSell)}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="전량" id="hope-all" />
                    <Label htmlFor="hope-all" className="cursor-pointer text-sm text-slate-600">
                      전량 매각
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="일부" id="hope-partial" />
                    <Label htmlFor="hope-partial" className="cursor-pointer text-sm text-slate-600">
                      일부 매각
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Lock-in 기간 */}
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">
                  Lock-in 기간
                  <InfoTooltip term="Lock-in" />
                </Label>
                <RadioGroup
                  value={formData.lockInYears.toString()}
                  onValueChange={(v) => updateField("lockInYears", parseInt(v) as 1 | 3 | 5)}
                  className="flex gap-2"
                >
                  {[1, 3, 5].map((year) => (
                    <div key={year} className="flex items-center">
                      <RadioGroupItem value={year.toString()} id={`lock-${year}`} className="peer sr-only" />
                      <Label
                        htmlFor={`lock-${year}`}
                        className={cn(
                          "cursor-pointer px-4 py-2 rounded-lg border text-sm",
                          "hover:bg-slate-50 hover:border-slate-300",
                          "peer-data-[state=checked]:border-slate-800 peer-data-[state=checked]:bg-slate-50"
                        )}
                      >
                        {year}년
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* 매각 지분율 */}
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">
                  매각 지분율 (%)
                </Label>
                <Input
                  type="number"
                  value={formData.equityPct}
                  onChange={(e) => updateField("equityPct", Number(e.target.value))}
                  min={1}
                  max={100}
                  className="h-10 border-slate-200"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 섹션 2: Cap Table */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Users className="h-4 w-4 text-slate-500" />
              <h3 className="font-medium text-sm text-slate-700">지분 구조 (Cap Table)</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-slate-600">창업자 지분 (%)</Label>
                <Input
                  type="number"
                  value={formData.founderShare}
                  onChange={(e) => updateField("founderShare", Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.1}
                  className="h-10 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-600">투자자 지분 (%)</Label>
                <Input
                  type="number"
                  value={formData.investorShare}
                  onChange={(e) => updateField("investorShare", Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.1}
                  className="h-10 border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-slate-600">옵션풀 (%)</Label>
                <Input
                  type="number"
                  value={formData.optionPool}
                  onChange={(e) => updateField("optionPool", Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.1}
                  className="h-10 border-slate-200"
                />
              </div>
            </div>
            <div className={cn(
              "text-sm",
              isCapTableValid ? "text-emerald-600" : "text-red-500"
            )}>
              합계: {capTableSum.toFixed(1)}% {isCapTableValid ? "✓" : "(100%여야 합니다)"}
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 섹션 3: 성장성 정보 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <TrendingUp className="h-4 w-4 text-slate-500" />
              <h3 className="font-medium text-sm text-slate-700">성장성 정보</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">
                  매출 성장률 (%)
                  <InfoTooltip term="매출 성장률" />
                </Label>
                <Input
                  type="number"
                  value={formData.revenueGrowth}
                  onChange={(e) => updateField("revenueGrowth", Number(e.target.value))}
                  min={-100}
                  max={300}
                  className="h-10 border-slate-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-700">
                  EBITDA 추이 (3년)
                  <InfoTooltip term="EBITDA" />
                </Label>
                <RadioGroup
                  value={formData.ebitdaTrend}
                  onValueChange={(v) => updateField("ebitdaTrend", v as EbitdaTrend)}
                  className="flex gap-2"
                >
                  {(["상승", "보합", "변동"] as EbitdaTrend[]).map((trend) => (
                    <div key={trend} className="flex items-center">
                      <RadioGroupItem value={trend} id={`trend-${trend}`} className="peer sr-only" />
                      <Label
                        htmlFor={`trend-${trend}`}
                        className={cn(
                          "cursor-pointer px-3 py-2 rounded-lg border text-xs",
                          "hover:bg-slate-50 hover:border-slate-300",
                          "peer-data-[state=checked]:border-slate-800 peer-data-[state=checked]:bg-slate-50"
                        )}
                      >
                        {trend}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-700">기업 소개 (선택)</Label>
              <textarea
                value={formData.companyProfile}
                onChange={(e) => updateField("companyProfile", e.target.value)}
                placeholder="예: 전략적 시너지 예상, 특정 사업부 분리 검토 중 등"
                className="w-full h-16 px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
              <p className="text-xs text-slate-400">
                "시너지", "사업부" 등 키워드가 포함되면 관련 시나리오가 활성화됩니다.
              </p>
            </div>
          </div>

          {/* 고급 옵션 */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              수수료 / 세금 / 할인율 설정
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">자문 수수료율 (%)</Label>
                    <Input
                      type="number"
                      value={formData.feeRate}
                      onChange={(e) => updateField("feeRate", Number(e.target.value))}
                      min={0}
                      max={10}
                      step={0.1}
                      className="h-10 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">
                      Earnout 달성 확률 (%)
                      <InfoTooltip term="Earnout" />
                    </Label>
                    <Input
                      type="number"
                      value={formData.earnoutProbability}
                      onChange={(e) => updateField("earnoutProbability", Number(e.target.value))}
                      min={0}
                      max={100}
                      step={5}
                      className="h-10 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-600">할인율 (%)</Label>
                    <Input
                      type="number"
                      value={formData.discountRate}
                      onChange={(e) => updateField("discountRate", Number(e.target.value))}
                      min={0}
                      max={30}
                      step={0.5}
                      className="h-10 border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="apply-tax"
                        checked={formData.applyTax}
                        onChange={(e) => updateField("applyTax", e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="apply-tax" className="cursor-pointer text-xs text-slate-600">
                        세율 적용
                      </Label>
                    </div>
                    {formData.applyTax && (
                      <Input
                        type="number"
                        value={formData.taxRate}
                        onChange={(e) => updateField("taxRate", Number(e.target.value))}
                        min={0}
                        max={50}
                        placeholder="세율 %"
                        className="h-10 border-slate-200"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-14 text-base font-semibold bg-slate-800 hover:bg-slate-700" 
            disabled={isLoading || !isCapTableValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                분석 진행 중...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-5 w-5" />
                상세 분석 실행
              </>
            )}
          </Button>

          <p className="text-xs text-slate-400 text-center">
            본 분석은 참고용이며, 실제 거래 구조/세금/수수료는 계약 및 개인 상황에 따라 달라질 수 있습니다.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
