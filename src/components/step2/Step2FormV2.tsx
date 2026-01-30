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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  Briefcase,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { Step1Result } from "@/lib/valuation/types";
import type { Step2V2Result } from "@/lib/simulations/types_v2";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface Step2FormV2Props {
  step1Result: Step1Result;
  onResult: (result: Step2V2Result) => void;
}

interface FormData {
  valuationBasis: "low" | "mid" | "high";
  lockInYears: 1 | 3 | 5;
  equityPct: number;
  discountRate: number;
}

const DEFAULT_FORM: FormData = {
  valuationBasis: "mid",
  lockInYears: 3,
  equityPct: 100,
  discountRate: 0.12,
};

export function Step2FormV2({ step1Result, onResult }: Step2FormV2Props) {
  const { value: draft, setValue: setDraft } = useLocalStorage<FormData>("sme_step2_draft_v2", DEFAULT_FORM);
  const [formData, setFormData] = React.useState<FormData>(DEFAULT_FORM);
  const [initialized, setInitialized] = React.useState(false);

  // draft 로드
  React.useEffect(() => {
    if (draft && !initialized) {
      setFormData(draft);
      setInitialized(true);
    }
  }, [draft, initialized]);

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // draft 저장
  React.useEffect(() => {
    setDraft(formData);
  }, [formData, setDraft]);

  // 기준 금액 계산
  const getEquityBasisValue = () => {
    const { low, high } = step1Result.equityValue;
    switch (formData.valuationBasis) {
      case "low": return low;
      case "high": return high;
      case "mid": return (low + high) / 2;
    }
  };

  // 예상 수령액 계산
  const estimatedProceeds = getEquityBasisValue() * (formData.equityPct / 100);

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        equity_basis_value: getEquityBasisValue(),
        valuation_basis: formData.valuationBasis,
        lock_in_years: formData.lockInYears,
        equity_scenarios: [formData.equityPct],
        payout: {
          upfront_pct: 100,
          escrow_pct: 0,
          earnout_pct: 0,
        },
        discount_rate: formData.discountRate,
        escrow_schedule_mode: "lump_sum_end",
        escrow_probability: 1.0,
        earnout_schedule_mode: "equal_annual",
      };

      const response = await fetch("/api/simulate/step2-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || "분석 실패");
      }

      // API 응답 → 내부 타입 변환
      const result: Step2V2Result = {
        basis: {
          equityBasisValue: data.data.basis.equity_basis_value,
          valuationBasis: data.data.basis.valuation_basis,
          lockInYears: data.data.basis.lock_in_years,
          discountRate: data.data.basis.discount_rate,
          payout: {
            upfrontPct: 100,
            escrowPct: 0,
            earnoutPct: 0,
          },
        },
        inputsEcho: {
          equityBasisValue: getEquityBasisValue(),
          valuationBasis: formData.valuationBasis,
          lockInYears: formData.lockInYears,
          equityScenarios: [formData.equityPct],
          payout: {
            upfrontPct: 100,
            escrowPct: 0,
            earnoutPct: 0,
          },
          discountRate: formData.discountRate,
          escrowScheduleMode: "lump_sum_end" as const,
          escrowProbability: 1.0,
          earnoutScheduleMode: "equal_annual" as const,
        },
        scenarios: data.data.scenarios.map((s: Record<string, unknown>) => ({
          equityPct: s.equity_pct,
          totalProceeds: s.total_proceeds,
          cases: {
            guaranteed: convertCase((s.cases as Record<string, unknown>).guaranteed as Record<string, unknown>),
            expected: convertCase((s.cases as Record<string, unknown>).expected as Record<string, unknown>),
            best: convertCase((s.cases as Record<string, unknown>).best as Record<string, unknown>),
          },
        })),
        warnings: data.data.warnings,
        explainText: data.data.explain_text,
      };

      onResult(result);
      
      // Save to server (non-blocking)
      fetch("/api/runs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "step2_cashflow",
          input: formData,
          result: result,
        }),
      }).catch((err) => console.warn("Failed to save run:", err));
    } catch (err) {
      console.error("Step2 V2 error:", err);
      setError(err instanceof Error ? err.message : "분석 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const basisLabels = {
    low: "보수적",
    mid: "기준",
    high: "낙관적",
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Briefcase className="h-5 w-5 text-slate-600" />
          현금흐름 분석
        </CardTitle>
        <CardDescription className="text-slate-500">
          거래 조건에 따른 예상 수령액을 분석해 드리겠습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기준 가격 선택 */}
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">기업가치 기준</Label>
            <p className="text-sm text-slate-500 mb-3">
              분석의 기준이 될 기업가치를 선택해 주십시오.
            </p>
            <RadioGroup
              value={formData.valuationBasis}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, valuationBasis: v as "low" | "mid" | "high" }))
              }
              className="grid grid-cols-3 gap-3"
            >
              {(["low", "mid", "high"] as const).map((basis) => {
                const value =
                  basis === "low"
                    ? step1Result.equityValue.low
                    : basis === "high"
                    ? step1Result.equityValue.high
                    : (step1Result.equityValue.low + step1Result.equityValue.high) / 2;
                return (
                  <div key={basis}>
                    <RadioGroupItem value={basis} id={`basis-${basis}`} className="peer sr-only" />
                    <Label
                      htmlFor={`basis-${basis}`}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border-2 border-slate-200 bg-white p-4 cursor-pointer transition-all",
                        "hover:border-slate-300 hover:bg-slate-50",
                        "peer-data-[state=checked]:border-slate-800 peer-data-[state=checked]:bg-slate-50"
                      )}
                    >
                      <span className="text-xs text-slate-500 mb-1">{basisLabels[basis]}</span>
                      <span className="font-semibold text-slate-800">{formatKRWBillions(value)}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Lock-in 기간 */}
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium inline-flex items-center">
              경영 참여 기간
              <InfoTooltip term="Lock-in" />
            </Label>
            <p className="text-sm text-slate-500 mb-3">
              인수 후 경영에 참여하실 예상 기간을 선택해 주십시오.
            </p>
            <RadioGroup
              value={String(formData.lockInYears)}
              onValueChange={(v) => {
                const years = Number(v) as 1 | 3 | 5;
                setFormData((prev) => ({ ...prev, lockInYears: years }));
              }}
              className="grid grid-cols-3 gap-3"
            >
              {[1, 3, 5].map((y) => (
                <div key={y}>
                  <RadioGroupItem value={String(y)} id={`lock-${y}`} className="peer sr-only" />
                  <Label
                    htmlFor={`lock-${y}`}
                    className={cn(
                      "flex items-center justify-center rounded-lg border-2 border-slate-200 bg-white p-4 cursor-pointer transition-all",
                      "hover:border-slate-300 hover:bg-slate-50",
                      "peer-data-[state=checked]:border-slate-800 peer-data-[state=checked]:bg-slate-50"
                    )}
                  >
                    <span className="font-semibold text-slate-800">{y}년</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 지분 매각 비율 */}
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium">매각 예정 지분율</Label>
            <p className="text-sm text-slate-500 mb-3">
              보유 지분 중 매각을 고려하시는 비율을 입력해 주십시오.
            </p>
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={1}
                max={100}
                value={formData.equityPct}
                onChange={(e) => setFormData((prev) => ({ ...prev, equityPct: Number(e.target.value) }))}
                className="w-24 text-center border-slate-200"
              />
              <span className="text-slate-600">%</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-700 transition-all"
                  style={{ width: `${formData.equityPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 할인율 */}
          <div className="space-y-3">
            <Label className="text-slate-700 font-medium inline-flex items-center">
              적용 할인율
              <InfoTooltip term="할인율" />
            </Label>
            <p className="text-sm text-slate-500 mb-3">
              미래 현금흐름의 현재가치 산정에 적용할 할인율입니다.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={8}
                max={20}
                value={formData.discountRate * 100}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, discountRate: Number(e.target.value) / 100 }))
                }
                className="flex-1 accent-slate-700"
              />
              <span className="w-16 text-center font-semibold text-slate-800">
                {(formData.discountRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* 예상 수령액 미리보기 */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">예상 거래 금액</span>
              <span className="text-xl font-bold text-slate-800">
                {formatKRWBillions(estimatedProceeds)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              * {basisLabels[formData.valuationBasis]} 기준, 지분 {formData.equityPct}% 매각 시
            </p>
          </div>

          {/* 에러 */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            size="lg"
            className="w-full bg-slate-800 hover:bg-slate-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                분석 진행 중...
              </>
            ) : (
              <>
                <Briefcase className="mr-2 h-4 w-4" />
                현금흐름 분석
              </>
            )}
          </Button>

          <p className="text-xs text-slate-400 text-center">
            본 분석 결과는 참고 자료이며, 실제 거래 조건에 따라 달라질 수 있습니다.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

// 헬퍼: API 응답 케이스 변환
function convertCase(c: Record<string, unknown>) {
  return {
    cashflows: c.cashflows as number[],
    totalNominal: c.total_nominal as number,
    pv: c.pv as number,
    kpis: {
      immediateAmount: (c.kpis as Record<string, unknown>).immediate_amount as number,
      finalAmount: (c.kpis as Record<string, unknown>).final_amount as number,
      pvToTotalRatio: (c.kpis as Record<string, unknown>).pv_to_total_ratio as number,
    },
  };
}
