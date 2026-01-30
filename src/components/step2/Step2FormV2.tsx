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
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings2,
} from "lucide-react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { Step1Result } from "@/lib/valuation/types";
import type { Step2V2Result, EscrowScheduleItem, EarnoutScheduleItem } from "@/lib/simulations/types_v2";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface Step2FormV2Props {
  step1Result: Step1Result;
  onResult: (result: Step2V2Result) => void;
}

interface FormData {
  valuationBasis: "low" | "mid" | "high";
  lockInYears: 1 | 3 | 5;
  equityScenarios: number[];
  upfrontPct: number;
  escrowPct: number;
  earnoutPct: number;
  discountRate: number;
  // 고급 옵션
  escrowScheduleMode: "lump_sum_end" | "equal_annual" | "custom";
  escrowProbability: number;
  escrowSchedule: EscrowScheduleItem[];
  earnoutScheduleMode: "equal_annual" | "custom";
  earnoutSchedule: EarnoutScheduleItem[];
}

const DEFAULT_FORM: FormData = {
  valuationBasis: "mid",
  lockInYears: 3,
  equityScenarios: [20, 50, 80, 100],
  upfrontPct: 50,
  escrowPct: 30,
  earnoutPct: 20,
  discountRate: 0.12,
  escrowScheduleMode: "lump_sum_end",
  escrowProbability: 0.9,
  escrowSchedule: [],
  earnoutScheduleMode: "equal_annual",
  earnoutSchedule: [],
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
  const [showAdvanced, setShowAdvanced] = React.useState(false);

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

  // 지급구조 합계 검증
  const payoutSum = formData.upfrontPct + formData.escrowPct + formData.earnoutPct;
  const isPayoutValid = Math.abs(payoutSum - 100) < 0.01;

  // 스케줄 업데이트
  const updateEscrowSchedule = (lockInYears: number) => {
    if (formData.escrowScheduleMode === "custom") {
      // custom은 유지
      return;
    }
    // 기본 스케줄 재생성
    setFormData((prev) => ({
      ...prev,
      escrowSchedule: [],
    }));
  };

  const updateEarnoutSchedule = (lockInYears: number) => {
    if (formData.earnoutScheduleMode === "custom") {
      return;
    }
    setFormData((prev) => ({
      ...prev,
      earnoutSchedule: [],
    }));
  };

  // 시나리오 추가/삭제
  const addScenario = () => {
    if (formData.equityScenarios.length < 10) {
      const lastValue = formData.equityScenarios[formData.equityScenarios.length - 1] || 0;
      const newValue = Math.min(lastValue + 10, 100);
      setFormData((prev) => ({
        ...prev,
        equityScenarios: [...prev.equityScenarios, newValue],
      }));
    }
  };

  const removeScenario = (index: number) => {
    if (formData.equityScenarios.length > 1) {
      setFormData((prev) => ({
        ...prev,
        equityScenarios: prev.equityScenarios.filter((_, i) => i !== index),
      }));
    }
  };

  const updateScenario = (index: number, value: number) => {
    setFormData((prev) => ({
      ...prev,
      equityScenarios: prev.equityScenarios.map((v, i) => (i === index ? value : v)),
    }));
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPayoutValid) {
      setError("지급 구조의 합계가 100%여야 합니다.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody = {
        equity_basis_value: getEquityBasisValue(),
        valuation_basis: formData.valuationBasis,
        lock_in_years: formData.lockInYears,
        equity_scenarios: formData.equityScenarios,
        payout: {
          upfront_pct: formData.upfrontPct,
          escrow_pct: formData.escrowPct,
          earnout_pct: formData.earnoutPct,
        },
        discount_rate: formData.discountRate,
        escrow_schedule_mode: formData.escrowScheduleMode,
        escrow_probability: formData.escrowProbability,
        escrow_schedule: formData.escrowScheduleMode === "custom" ? formData.escrowSchedule.map((s) => ({
          year: s.year,
          pct_of_total: s.pctOfTotal,
          probability: s.probability,
        })) : undefined,
        earnout_schedule_mode: formData.earnoutScheduleMode,
        earnout_schedule: formData.earnoutScheduleMode === "custom" ? formData.earnoutSchedule.map((s) => ({
          year: s.year,
          pct_of_total: s.pctOfTotal,
          probability: s.probability,
        })) : undefined,
      };

      const response = await fetch("/api/simulate/step2-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.errors?.[0]?.message || "시뮬레이션 실패");
      }

      // API 응답 → 내부 타입 변환
      const result: Step2V2Result = {
        basis: {
          equityBasisValue: data.data.basis.equity_basis_value,
          valuationBasis: data.data.basis.valuation_basis,
          lockInYears: data.data.basis.lock_in_years,
          discountRate: data.data.basis.discount_rate,
          payout: {
            upfrontPct: data.data.basis.payout.upfront_pct,
            escrowPct: data.data.basis.payout.escrow_pct,
            earnoutPct: data.data.basis.payout.earnout_pct,
          },
        },
        inputsEcho: formData as unknown as Step2V2Result["inputsEcho"],
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
    } catch (err) {
      console.error("Step2 V2 error:", err);
      setError(err instanceof Error ? err.message : "시뮬레이션 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          시뮬레이션 설정
        </CardTitle>
        <CardDescription>
          락인 기간, 지분 시나리오, 지급 구조를 설정하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기준 가격 선택 */}
          <div className="space-y-3">
            <Label>기준 가격</Label>
            <RadioGroup
              value={formData.valuationBasis}
              onValueChange={(v) =>
                setFormData((prev) => ({ ...prev, valuationBasis: v as "low" | "mid" | "high" }))
              }
              className="grid grid-cols-3 gap-2"
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
                        "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 cursor-pointer",
                        "hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                      )}
                    >
                      <span className="text-xs text-muted-foreground capitalize">{basis}</span>
                      <span className="font-medium">{formatKRWBillions(value)}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Lock-in 기간 */}
          <div className="space-y-3">
            <Label>Lock-in 기간</Label>
            <RadioGroup
              value={String(formData.lockInYears)}
              onValueChange={(v) => {
                const years = Number(v) as 1 | 3 | 5;
                setFormData((prev) => ({ ...prev, lockInYears: years }));
                updateEscrowSchedule(years);
                updateEarnoutSchedule(years);
              }}
              className="grid grid-cols-3 gap-2"
            >
              {[1, 3, 5].map((y) => (
                <div key={y}>
                  <RadioGroupItem value={String(y)} id={`lock-${y}`} className="peer sr-only" />
                  <Label
                    htmlFor={`lock-${y}`}
                    className={cn(
                      "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-3 cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                    )}
                  >
                    {y}년
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* 지분 시나리오 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>지분 시나리오 (%)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addScenario}
                disabled={formData.equityScenarios.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {formData.equityScenarios.map((value, index) => (
                <div key={index} className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={value}
                    onChange={(e) => updateScenario(index, Number(e.target.value))}
                    className="pr-8"
                  />
                  {formData.equityScenarios.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeScenario(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* 지급 구조 */}
          <div className="space-y-4">
            <Label>지급 구조 (합계 100%)</Label>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">즉시 지급 (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.upfrontPct}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, upfrontPct: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Escrow (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.escrowPct}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, escrowPct: Number(e.target.value) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Earn-out (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.earnoutPct}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, earnoutPct: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            {!isPayoutValid && (
              <p className="text-sm text-destructive">
                현재 합계: {payoutSum.toFixed(1)}% (100%여야 함)
              </p>
            )}
          </div>

          {/* 할인율 */}
          <div className="space-y-2">
            <Label>할인율</Label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={8}
                max={20}
                value={formData.discountRate * 100}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, discountRate: Number(e.target.value) / 100 }))
                }
                className="flex-1"
              />
              <span className="w-16 text-center font-medium">
                {(formData.discountRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <Separator />

          {/* 고급 옵션 토글 */}
          <div>
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                고급 옵션 (지급 스케줄/확률)
              </span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>

            {showAdvanced && (
              <div className="mt-4 space-y-6 p-4 border rounded-lg bg-muted/30">
                {/* Escrow 설정 */}
                <div className="space-y-3">
                  <Label>Escrow 지급 방식</Label>
                  <RadioGroup
                    value={formData.escrowScheduleMode}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        escrowScheduleMode: v as "lump_sum_end" | "equal_annual" | "custom",
                      }))
                    }
                    className="grid grid-cols-3 gap-2"
                  >
                    <div>
                      <RadioGroupItem value="lump_sum_end" id="escrow-lump" className="peer sr-only" />
                      <Label
                        htmlFor="escrow-lump"
                        className={cn(
                          "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 cursor-pointer text-xs",
                          "hover:bg-accent peer-data-[state=checked]:border-primary"
                        )}
                      >
                        종료 시 일괄
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="equal_annual" id="escrow-equal" className="peer sr-only" />
                      <Label
                        htmlFor="escrow-equal"
                        className={cn(
                          "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 cursor-pointer text-xs",
                          "hover:bg-accent peer-data-[state=checked]:border-primary"
                        )}
                      >
                        연차별 균등
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="custom" id="escrow-custom" className="peer sr-only" />
                      <Label
                        htmlFor="escrow-custom"
                        className={cn(
                          "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 cursor-pointer text-xs",
                          "hover:bg-accent peer-data-[state=checked]:border-primary"
                        )}
                      >
                        커스텀
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Escrow 달성 확률</Label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={formData.escrowProbability * 100}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            escrowProbability: Number(e.target.value) / 100,
                          }))
                        }
                        className="flex-1"
                      />
                      <span className="w-12 text-center text-sm">
                        {(formData.escrowProbability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Earnout 설정 */}
                <div className="space-y-3">
                  <Label>Earn-out 지급 방식</Label>
                  <RadioGroup
                    value={formData.earnoutScheduleMode}
                    onValueChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        earnoutScheduleMode: v as "equal_annual" | "custom",
                      }))
                    }
                    className="grid grid-cols-2 gap-2"
                  >
                    <div>
                      <RadioGroupItem value="equal_annual" id="earnout-equal" className="peer sr-only" />
                      <Label
                        htmlFor="earnout-equal"
                        className={cn(
                          "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 cursor-pointer text-xs",
                          "hover:bg-accent peer-data-[state=checked]:border-primary"
                        )}
                      >
                        연차별 균등 (확률 60%)
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="custom" id="earnout-custom" className="peer sr-only" />
                      <Label
                        htmlFor="earnout-custom"
                        className={cn(
                          "flex items-center justify-center rounded-md border-2 border-muted bg-popover p-2 cursor-pointer text-xs",
                          "hover:bg-accent peer-data-[state=checked]:border-primary"
                        )}
                      >
                        커스텀
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* 커스텀 스케줄 편집 (향후 구현) */}
                {(formData.escrowScheduleMode === "custom" || formData.earnoutScheduleMode === "custom") && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      커스텀 스케줄 편집은 추후 지원 예정입니다. 현재는 기본값이 적용됩니다.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          {/* 에러 */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isLoading || !isPayoutValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                시뮬레이션 중...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                시뮬레이션 실행
              </>
            )}
          </Button>
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
