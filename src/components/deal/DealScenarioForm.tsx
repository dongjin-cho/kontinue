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
} from "lucide-react";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import type { Step1Result } from "@/lib/valuation/types";
import type { DealScenarioOutput, HopeToSell, EbitdaTrend } from "@/lib/deal/scenarios";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface DealScenarioFormProps {
  step1Result: Step1Result | null;
  onResult: (result: DealScenarioOutput) => void;
}

interface FormData {
  // Cap Table
  founderShare: number;
  investorShare: number;
  optionPool: number;

  // 거래 전제
  hopeToSell: HopeToSell;
  expectedExitDate: string;
  secondaryRatio: number;
  primaryIssue: boolean;

  // 보조 정보
  revenueGrowth: number;
  ebitdaTrend: EbitdaTrend;
  companyProfile: string;

  // 계산 기준
  escrowAssumption: number;
  earnoutProbability: number;
  feeRate: number;
  taxRate: number;
  applyTax: boolean;
}

const initialFormData: FormData = {
  founderShare: 60,
  investorShare: 30,
  optionPool: 10,
  hopeToSell: "전량",
  expectedExitDate: "",
  secondaryRatio: 100,
  primaryIssue: false,
  revenueGrowth: 10,
  ebitdaTrend: "보합",
  companyProfile: "",
  escrowAssumption: 0,
  earnoutProbability: 50,
  feeRate: 3,
  taxRate: 22,
  applyTax: false,
};

export function DealScenarioForm({ step1Result, onResult }: DealScenarioFormProps) {
  const { value: savedData, setValue: saveData } = useLocalStorage<FormData>(
    "sme_deal_scenarios_draft_v1",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!step1Result) {
      setError("Step1 결과가 필요합니다. 먼저 기업가치 평가를 완료해주세요.");
      return;
    }

    if (!isCapTableValid) {
      setError(`Cap Table 합계가 100%여야 합니다. (현재: ${capTableSum.toFixed(1)}%)`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/deal-scenarios/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equityValueLow: step1Result.equityValue.low,
          equityValueHigh: step1Result.equityValue.high,
          equityValueMedian: (step1Result.equityValue.low + step1Result.equityValue.high) / 2,
          capTable: {
            founderShare: formData.founderShare,
            investorShare: formData.investorShare,
            optionPool: formData.optionPool,
          },
          hopeToSell: formData.hopeToSell,
          expectedExitDate: formData.expectedExitDate || undefined,
          secondaryRatio: formData.secondaryRatio,
          primaryIssue: formData.primaryIssue,
          revenueGrowth: formData.revenueGrowth,
          ebitdaTrend: formData.ebitdaTrend,
          companyProfile: formData.companyProfile,
          escrowAssumption: formData.escrowAssumption / 100,
          earnoutProbability: formData.earnoutProbability / 100,
          feeRate: formData.feeRate / 100,
          taxRate: formData.applyTax ? formData.taxRate / 100 : 0,
          saveToServer: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "시나리오 생성 중 오류가 발생했습니다.");
      }

      onResult(data.data);

      // localStorage에 결과 저장
      if (typeof window !== "undefined") {
        localStorage.setItem("sme_deal_scenarios_result_v1", JSON.stringify(data.data));
      }

      // Save to server (non-blocking)
      fetch("/api/runs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "step2_deal_scenarios",
          input: formData,
          result: data.data,
        }),
      }).catch((err) => console.warn("Failed to save deal scenarios:", err));
    } catch (err) {
      console.error("Deal scenarios error:", err);
      setError(err instanceof Error ? err.message : "시나리오 생성 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!step1Result) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
            <p className="text-lg font-medium">Step1 결과가 필요합니다</p>
            <p className="text-muted-foreground">
              먼저 기업가치 평가를 완료해주세요.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const equityMedian = (step1Result.equityValue.low + step1Result.equityValue.high) / 2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          딜 구조 시나리오 입력
        </CardTitle>
        <CardDescription>
          기업가치 기준: {formatKRWBillions(equityMedian)} (Median)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cap Table */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Cap Table (지분 구조)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">창업자 지분 (%)</Label>
                <Input
                  type="number"
                  value={formData.founderShare}
                  onChange={(e) => updateField("founderShare", Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.1}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">투자자 지분 (%)</Label>
                <Input
                  type="number"
                  value={formData.investorShare}
                  onChange={(e) => updateField("investorShare", Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.1}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">옵션풀 (%)</Label>
                <Input
                  type="number"
                  value={formData.optionPool}
                  onChange={(e) => updateField("optionPool", Number(e.target.value))}
                  min={0}
                  max={100}
                  step={0.1}
                  className="h-10"
                />
              </div>
            </div>
            <div className={cn(
              "text-sm",
              isCapTableValid ? "text-green-600" : "text-destructive"
            )}>
              합계: {capTableSum.toFixed(1)}% {isCapTableValid ? "✓" : "(100%여야 합니다)"}
            </div>
          </div>

          <Separator />

          {/* 거래 전제 조건 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              거래 전제 조건
            </h3>

            <div className="space-y-2">
              <Label>매각 희망 범위</Label>
              <RadioGroup
                value={formData.hopeToSell}
                onValueChange={(v) => updateField("hopeToSell", v as HopeToSell)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="전량" id="hope-all" />
                  <Label htmlFor="hope-all" className="cursor-pointer">
                    전량 매각
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="일부" id="hope-partial" />
                  <Label htmlFor="hope-partial" className="cursor-pointer">
                    일부 매각
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>예상 엑싯 시점</Label>
              <Input
                type="month"
                value={formData.expectedExitDate}
                onChange={(e) => updateField("expectedExitDate", e.target.value)}
                className="h-10 w-48"
              />
            </div>
          </div>

          <Separator />

          {/* 보조 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              보조 정보 (추천 판단용)
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="inline-flex items-center">
                  매출 성장률 (%)
                  <InfoTooltip term="매출 성장률" />
                </Label>
                <Input
                  type="number"
                  value={formData.revenueGrowth}
                  onChange={(e) => updateField("revenueGrowth", Number(e.target.value))}
                  min={-100}
                  max={300}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="inline-flex items-center">
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
                          "cursor-pointer px-3 py-2 rounded border text-xs",
                          "hover:bg-accent",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
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
              <Label>기업 소개 (키워드: 시너지, 사업부 등)</Label>
              <textarea
                value={formData.companyProfile}
                onChange={(e) => updateField("companyProfile", e.target.value)}
                placeholder="예: 전략적 시너지가 예상되는 사업부 분리 매각 검토 중"
                className="w-full h-20 px-3 py-2 rounded-md border text-sm resize-none"
              />
            </div>
          </div>

          <Separator />

          {/* 수수료/세금 옵션 */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              수수료 / 세금 옵션
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">자문 수수료율 (%)</Label>
                    <Input
                      type="number"
                      value={formData.feeRate}
                      onChange={(e) => updateField("feeRate", Number(e.target.value))}
                      min={0}
                      max={10}
                      step={0.1}
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">기본값: 3%</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs inline-flex items-center">
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
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="apply-tax"
                      checked={formData.applyTax}
                      onChange={(e) => updateField("applyTax", e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="apply-tax" className="cursor-pointer text-sm">
                      단순 세율 적용
                    </Label>
                  </div>
                  {formData.applyTax && (
                    <div className="space-y-2 ml-6">
                      <Label className="text-xs">양도소득세 실효세율 (%)</Label>
                      <Input
                        type="number"
                        value={formData.taxRate}
                        onChange={(e) => updateField("taxRate", Number(e.target.value))}
                        min={0}
                        max={50}
                        step={1}
                        className="h-10 w-32"
                      />
                      <p className="text-xs text-muted-foreground">
                        ⚠️ 세금은 개인/지분/특례에 따라 달라집니다 (단순화 가정)
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs inline-flex items-center">
                    Escrow 비율 (%)
                    <InfoTooltip term="Escrow" />
                  </Label>
                  <Input
                    type="number"
                    value={formData.escrowAssumption}
                    onChange={(e) => updateField("escrowAssumption", Number(e.target.value))}
                    min={0}
                    max={30}
                    step={1}
                    className="h-10 w-32"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full h-12" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                시나리오 생성 중...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                딜 시나리오 생성
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            본 시뮬레이션은 참고용이며 실제 거래 구조/세금/수수료는 계약 및 개인 상황에 따라 달라질 수 있습니다.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
