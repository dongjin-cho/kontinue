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
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Calculator,
  Loader2,
  Plus,
  X,
  Clock,
  Percent,
  Wallet,
} from "lucide-react";
import type { Step1Result } from "@/lib/valuation/types";
import type { Step2Result } from "@/lib/simulations/types";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

interface Step2FormProps {
  step1Result: Step1Result;
  onResult: (result: Step2Result) => void;
}

interface FormData {
  valuationBasis: "low" | "mid" | "high";
  lockInYears: 1 | 3 | 5;
  equityScenarios: number[];
  upfrontPct: number;
  escrowPct: number;
  earnoutPct: number;
  discountRate: number;
}

const initialFormData: FormData = {
  valuationBasis: "mid",
  lockInYears: 3,
  equityScenarios: [20, 50, 80, 100],
  upfrontPct: 50,
  escrowPct: 30,
  earnoutPct: 20,
  discountRate: 12,
};

export function Step2Form({ step1Result, onResult }: Step2FormProps) {
  const { value: savedData, setValue: saveData } = useLocalStorage<FormData>(
    "sme_step2_draft",
    initialFormData
  );

  const [formData, setFormData] = React.useState<FormData>(initialFormData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const [newScenario, setNewScenario] = React.useState("");

  // 기준 지분가치 계산
  const getEquityBasisValue = React.useCallback(() => {
    const { low, high } = step1Result.equityValue;
    const mid = (low + high) / 2;
    
    switch (formData.valuationBasis) {
      case "low":
        return low;
      case "high":
        return high;
      default:
        return mid;
    }
  }, [step1Result.equityValue, formData.valuationBasis]);

  // Load saved data on client
  React.useEffect(() => {
    setIsClient(true);
    if (savedData && savedData !== initialFormData) {
      setFormData(savedData);
    }
  }, [savedData]);

  // Save to localStorage on change
  React.useEffect(() => {
    if (isClient) {
      saveData(formData);
    }
  }, [formData, isClient, saveData]);

  // 지급 구조 합계
  const payoutSum = formData.upfrontPct + formData.escrowPct + formData.earnoutPct;
  const isPayoutValid = Math.abs(payoutSum - 100) < 0.01;

  // 폼 유효성 검사
  const isFormValid = React.useMemo(() => {
    return (
      isPayoutValid &&
      formData.equityScenarios.length >= 1 &&
      formData.equityScenarios.length <= 10 &&
      formData.discountRate >= 8 &&
      formData.discountRate <= 20
    );
  }, [formData, isPayoutValid]);

  // 시나리오 추가
  const addScenario = () => {
    const value = parseInt(newScenario);
    if (value >= 1 && value <= 100 && formData.equityScenarios.length < 10) {
      setFormData((prev) => ({
        ...prev,
        equityScenarios: [...prev.equityScenarios, value].sort((a, b) => a - b),
      }));
      setNewScenario("");
    }
  };

  // 시나리오 삭제
  const removeScenario = (index: number) => {
    if (formData.equityScenarios.length > 1) {
      setFormData((prev) => ({
        ...prev,
        equityScenarios: prev.equityScenarios.filter((_, i) => i !== index),
      }));
    }
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    setIsLoading(true);
    setErrors({});

    try {
      const equityBasisValue = getEquityBasisValue();

      const response = await fetch("/api/simulate/step2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equity_basis_value: equityBasisValue,
          valuation_basis: formData.valuationBasis,
          lock_in_years: formData.lockInYears,
          equity_scenarios: formData.equityScenarios,
          payout: {
            upfront_pct: formData.upfrontPct,
            escrow_pct: formData.escrowPct,
            earnout_pct: formData.earnoutPct,
          },
          discount_rate: formData.discountRate / 100,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 내부 형식으로 변환
        const result: Step2Result = {
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
          scenarios: data.data.scenarios.map((s: Record<string, unknown>) => ({
            equityPct: s.equity_pct,
            totalProceeds: s.total_proceeds,
            pv: s.pv,
            cashflows: s.cashflows,
            kpis: {
              immediateAmount: (s.kpis as Record<string, unknown>).immediate_amount,
              finalAmount: (s.kpis as Record<string, unknown>).final_amount,
              pvToTotalRatio: (s.kpis as Record<string, unknown>).pv_to_total_ratio,
            },
          })),
          warnings: data.data.warnings,
          explainText: data.data.explain_text,
        };

        onResult(result);

        // Save result to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("sme_step2_result", JSON.stringify(result));
        }
      } else {
        const apiErrors: Record<string, string> = {};
        data.errors?.forEach((err: { field: string; message: string }) => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
      }
    } catch (error) {
      console.error("Submit error:", error);
      setErrors({ general: "서버 오류가 발생했습니다. 다시 시도해주세요." });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isClient) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          시뮬레이션 설정
        </CardTitle>
        <CardDescription>
          락인 기간, 지분율, 지급 구조를 설정하여 실제 수령액을 시뮬레이션합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기준 가격 선택 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">기준 지분가치</Label>
              <Badge variant="secondary">
                {formatKRWBillions(getEquityBasisValue())} 원
              </Badge>
            </div>
            <RadioGroup
              value={formData.valuationBasis}
              onValueChange={(v) => updateField("valuationBasis", v as "low" | "mid" | "high")}
              className="grid grid-cols-3 gap-2"
            >
              {[
                { value: "low", label: "보수적", amount: step1Result.equityValue.low },
                { value: "mid", label: "중간", amount: (step1Result.equityValue.low + step1Result.equityValue.high) / 2 },
                { value: "high", label: "낙관적", amount: step1Result.equityValue.high },
              ].map((option) => (
                <div key={option.value} className="flex items-center">
                  <RadioGroupItem
                    value={option.value}
                    id={`basis-${option.value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`basis-${option.value}`}
                    className={cn(
                      "flex w-full flex-col cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-3 transition-all",
                      "hover:bg-accent hover:text-accent-foreground",
                      "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                    )}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatKRWBillions(option.amount)}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* Lock-in 기간 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Lock-in 기간
            </Label>
            <RadioGroup
              value={formData.lockInYears.toString()}
              onValueChange={(v) => updateField("lockInYears", parseInt(v) as 1 | 3 | 5)}
              className="grid grid-cols-3 gap-2"
            >
              {[1, 3, 5].map((years) => (
                <div key={years} className="flex items-center">
                  <RadioGroupItem
                    value={years.toString()}
                    id={`lock-${years}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`lock-${years}`}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-popover p-3 font-medium transition-all",
                      "hover:bg-accent hover:text-accent-foreground",
                      "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                    )}
                  >
                    {years}년
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Separator />

          {/* 지분 시나리오 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Percent className="h-4 w-4" />
                지분 시나리오
              </Label>
              <span className="text-xs text-muted-foreground">
                {formData.equityScenarios.length}/10
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.equityScenarios.map((pct, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="text-sm px-3 py-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => removeScenario(idx)}
                >
                  {pct}%
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
            {formData.equityScenarios.length < 10 && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="1~100"
                  value={newScenario}
                  onChange={(e) => setNewScenario(e.target.value)}
                  min={1}
                  max={100}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addScenario}
                  disabled={!newScenario || parseInt(newScenario) < 1 || parseInt(newScenario) > 100}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  추가
                </Button>
              </div>
            )}
            {formData.equityScenarios.length === 0 && (
              <p className="text-xs text-destructive">최소 1개의 시나리오가 필요합니다</p>
            )}
          </div>

          <Separator />

          {/* 지급 구조 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                지급 구조
              </Label>
              <Badge variant={isPayoutValid ? "secondary" : "destructive"}>
                합계: {payoutSum}%
              </Badge>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="upfront" className="text-sm">
                    즉시 지급 (t=0)
                  </Label>
                  <span className="text-sm font-medium">{formData.upfrontPct}%</span>
                </div>
                <Input
                  id="upfront"
                  type="range"
                  min={0}
                  max={100}
                  value={formData.upfrontPct}
                  onChange={(e) => updateField("upfrontPct", parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="escrow" className="text-sm">
                    Escrow (종료 시점 일괄)
                  </Label>
                  <span className="text-sm font-medium">{formData.escrowPct}%</span>
                </div>
                <Input
                  id="escrow"
                  type="range"
                  min={0}
                  max={100}
                  value={formData.escrowPct}
                  onChange={(e) => updateField("escrowPct", parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="earnout" className="text-sm">
                    Earn-out (기간 분할)
                  </Label>
                  <span className="text-sm font-medium">{formData.earnoutPct}%</span>
                </div>
                <Input
                  id="earnout"
                  type="range"
                  min={0}
                  max={100}
                  value={formData.earnoutPct}
                  onChange={(e) => updateField("earnoutPct", parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            {!isPayoutValid && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  지급 구조의 합계가 100%여야 합니다 (현재: {payoutSum}%)
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          {/* 할인율 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="discount" className="text-base font-semibold">
                할인율 (현재가치)
              </Label>
              <span className="text-sm font-medium">{formData.discountRate}%</span>
            </div>
            <Input
              id="discount"
              type="range"
              min={8}
              max={20}
              step={1}
              value={formData.discountRate}
              onChange={(e) => updateField("discountRate", parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>8% (보수적)</span>
              <span>20% (공격적)</span>
            </div>
          </div>

          {/* 에러 메시지 */}
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}
          {errors.payout && (
            <Alert variant="destructive">
              <AlertDescription>{errors.payout}</AlertDescription>
            </Alert>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-semibold"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                시뮬레이션 중...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-5 w-5" />
                시뮬레이션 실행
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
