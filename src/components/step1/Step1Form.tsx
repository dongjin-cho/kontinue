"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { AlertTriangle, Briefcase, Loader2 } from "lucide-react";
import { IndustrySelect } from "./IndustrySelect";
import { CurrencyInput } from "./CurrencyInput";
import { EMPLOYEE_BANDS, type IndustryGroup } from "@/lib/valuation/constants";
import type { Step1Input, Step1Result } from "@/lib/valuation/types";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

interface Step1FormProps {
  onResult: (result: Step1Result) => void;
}

interface FormData {
  industryCode: string;
  industryGroup: IndustryGroup | undefined;
  inputMode: "ksic" | "direct";
  foundedYear: string;
  employeeBand: string;
  revenue: number;
  ebitda: number;
  ebitdaType: "EBITDA" | "영업이익";
  netIncome: number;
  revenueGrowth: string;
  totalDebt: number;
  cash: number;
}

const initialFormData: FormData = {
  industryCode: "",
  industryGroup: undefined,
  inputMode: "direct",
  foundedYear: "",
  employeeBand: "",
  revenue: 0,
  ebitda: 0,
  ebitdaType: "EBITDA",
  netIncome: 0,
  revenueGrowth: "",
  totalDebt: 0,
  cash: 0,
};

export function Step1Form({ onResult }: Step1FormProps) {
  const { value: savedData, setValue: saveData } = useLocalStorage<FormData>(
    "sme_step1_draft",
    initialFormData
  );
  
  const [formData, setFormData] = React.useState<FormData>(initialFormData);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

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

  // Validate form
  const validateForm = React.useCallback(() => {
    const newErrors: Record<string, string> = {};
    const newWarnings: string[] = [];
    const currentYear = new Date().getFullYear();

    // Required fields
    if (!formData.industryCode && !formData.industryGroup) {
      newErrors.industry = "산업 분류를 선택해 주십시오";
    }
    if (!formData.foundedYear) {
      newErrors.foundedYear = "설립연도를 입력해 주십시오";
    } else {
      const year = parseInt(formData.foundedYear);
      if (year > currentYear) {
        newErrors.foundedYear = "설립연도는 현재 연도보다 클 수 없습니다";
      } else if (year < 1900) {
        newErrors.foundedYear = "올바른 설립연도를 입력해 주십시오";
      }
    }
    if (!formData.employeeBand) {
      newErrors.employeeBand = "직원 수 구간을 선택해 주십시오";
    }
    if (formData.revenue <= 0) {
      newErrors.revenue = "매출액을 입력해 주십시오";
    }
    if (formData.revenueGrowth === "") {
      newErrors.revenueGrowth = "매출 성장률을 입력해 주십시오";
    } else {
      const growth = parseFloat(formData.revenueGrowth);
      if (growth < -100 || growth > 300) {
        newErrors.revenueGrowth = "성장률은 -100% ~ 300% 범위 내여야 합니다";
      }
    }

    // Consistency warnings
    if (formData.revenue > 0) {
      if (Math.abs(formData.ebitda) > formData.revenue * 0.5) {
        newWarnings.push("EBITDA가 매출액의 50%를 초과합니다. 입력값을 확인해 주십시오.");
      }
      if (Math.abs(formData.netIncome) > formData.revenue * 0.5) {
        newWarnings.push("순이익이 매출액의 50%를 초과합니다. 입력값을 확인해 주십시오.");
      }
    }
    if (formData.netIncome > formData.ebitda && formData.ebitda > 0) {
      newWarnings.push("순이익이 EBITDA보다 큽니다. 일반적이지 않은 수치입니다.");
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Check if form is valid
  const isFormValid = React.useMemo(() => {
    return (
      (formData.industryCode || formData.industryGroup) &&
      formData.foundedYear &&
      formData.employeeBand &&
      formData.revenue > 0 &&
      formData.revenueGrowth !== ""
    );
  }, [formData]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const input: Step1Input = {
        industryCode: formData.industryCode || formData.industryGroup || "",
        industryGroup: formData.industryGroup,
        foundedYear: parseInt(formData.foundedYear),
        employeeBand: formData.employeeBand as Step1Input["employeeBand"],
        revenue: formData.revenue,
        ebitda: formData.ebitda,
        ebitdaType: formData.ebitdaType,
        netIncome: formData.netIncome,
        revenueGrowth: parseFloat(formData.revenueGrowth),
        totalDebt: formData.totalDebt,
        cash: formData.cash,
      };

      const response = await fetch("/api/valuation/step1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (data.success) {
        onResult(data.data);
        // Save result to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("sme_step1_result", JSON.stringify(data.data));
        }
        // Save to server (non-blocking)
        fetch("/api/runs/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            step: "step1",
            input: formData,
            result: data.data,
          }),
        }).catch((err) => console.warn("Failed to save run:", err));
      } else {
        // Handle API errors
        const apiErrors: Record<string, string> = {};
        data.errors?.forEach((err: { field: string; message: string }) => {
          apiErrors[err.field] = err.message;
        });
        setErrors(apiErrors);
      }
    } catch (error) {
      console.error("Submit error:", error);
      setErrors({ general: "서버 오류가 발생했습니다. 다시 시도해 주십시오." });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isClient) {
    return (
      <Card className="w-full border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Briefcase className="h-5 w-5 text-slate-600" />
          기업 정보 입력
        </CardTitle>
        <CardDescription className="text-slate-500">
          아래 정보를 입력해 주시면 귀사의 대략적인 기업가치를 산출해 드리겠습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-slate-700 border-b border-slate-100 pb-2">
              기본 정보
            </h3>

            <IndustrySelect
              ksicCode={formData.industryCode}
              industryGroup={formData.industryGroup}
              inputMode={formData.inputMode}
              onKsicChange={(code) => updateField("industryCode", code)}
              onIndustryGroupChange={(group) => updateField("industryGroup", group)}
              onInputModeChange={(mode) => updateField("inputMode", mode)}
            />
            {errors.industry && (
              <p className="text-xs text-red-600">{errors.industry}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="foundedYear" className="text-sm font-medium text-slate-700">
                  설립연도 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="foundedYear"
                  type="number"
                  placeholder="예: 2015"
                  value={formData.foundedYear}
                  onChange={(e) => updateField("foundedYear", e.target.value)}
                  min={1900}
                  max={new Date().getFullYear()}
                  className={cn(
                    "h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400",
                    errors.foundedYear && "border-red-300"
                  )}
                />
                {errors.foundedYear && (
                  <p className="text-xs text-red-600">{errors.foundedYear}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  직원 수 <span className="text-red-500">*</span>
                </Label>
                <RadioGroup
                  value={formData.employeeBand}
                  onValueChange={(value) => updateField("employeeBand", value)}
                  className="grid grid-cols-2 gap-1"
                >
                  {EMPLOYEE_BANDS.map((band) => (
                    <div key={band.value} className="flex items-center">
                      <RadioGroupItem
                        value={band.value}
                        id={`band-${band.value}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`band-${band.value}`}
                        className={cn(
                          "flex w-full cursor-pointer items-center justify-center rounded-lg border border-slate-200 px-2 py-2 text-xs font-medium transition-all",
                          "hover:bg-slate-50 hover:border-slate-300",
                          "peer-data-[state=checked]:border-slate-800 peer-data-[state=checked]:bg-slate-50"
                        )}
                      >
                        {band.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {errors.employeeBand && (
                  <p className="text-xs text-red-600">{errors.employeeBand}</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 재무 성과 */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-slate-700 border-b border-slate-100 pb-2">
              재무 성과
            </h3>

            <CurrencyInput
              id="revenue"
              label={
                <span className="inline-flex items-center text-slate-700">
                  최근 연 매출액
                  <InfoTooltip term="매출액" />
                </span>
              }
              value={formData.revenue}
              onChange={(value) => updateField("revenue", value)}
              placeholder="예: 5,000,000,000"
              required
              error={errors.revenue}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-slate-700 inline-flex items-center">
                  EBITDA / 영업이익 <span className="text-red-500 ml-1">*</span>
                  <InfoTooltip term="EBITDA" />
                </Label>
                <RadioGroup
                  value={formData.ebitdaType}
                  onValueChange={(v) => updateField("ebitdaType", v as "EBITDA" | "영업이익")}
                  className="flex gap-3"
                >
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="EBITDA" id="type-ebitda" />
                    <Label htmlFor="type-ebitda" className="text-xs cursor-pointer text-slate-600">
                      EBITDA
                    </Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="영업이익" id="type-op" />
                    <Label htmlFor="type-op" className="text-xs cursor-pointer text-slate-600">
                      영업이익
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <CurrencyInput
                id="ebitda"
                label=""
                value={formData.ebitda}
                onChange={(value) => updateField("ebitda", value)}
                placeholder="예: 800,000,000"
                description="적자인 경우 0으로 입력해 주십시오"
                allowNegative
              />
            </div>

            <CurrencyInput
              id="netIncome"
              label={<span className="text-slate-700">순이익</span>}
              value={formData.netIncome}
              onChange={(value) => updateField("netIncome", value)}
              placeholder="예: 500,000,000"
              allowNegative
            />

            <div className="space-y-2">
              <Label htmlFor="revenueGrowth" className="text-sm font-medium text-slate-700 inline-flex items-center">
                매출 성장률 (전년 대비) <span className="text-red-500 ml-1">*</span>
                <InfoTooltip term="매출 성장률" />
              </Label>
              <div className="relative">
                <Input
                  id="revenueGrowth"
                  type="number"
                  value={formData.revenueGrowth}
                  onChange={(e) => updateField("revenueGrowth", e.target.value)}
                  placeholder="예: 15"
                  min={-100}
                  max={300}
                  className={cn(
                    "pr-8 h-12 border-slate-200 focus:border-slate-400 focus:ring-slate-400",
                    errors.revenueGrowth && "border-red-300"
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  %
                </span>
              </div>
              {errors.revenueGrowth && (
                <p className="text-xs text-red-600">{errors.revenueGrowth}</p>
              )}
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 부채 및 현금 */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-slate-700 border-b border-slate-100 pb-2 inline-flex items-center">
              부채 및 현금
              <InfoTooltip term="순부채" />
            </h3>

            <CurrencyInput
              id="totalDebt"
              label={<span className="text-slate-700">총 차입금</span>}
              value={formData.totalDebt}
              onChange={(value) => updateField("totalDebt", value)}
              placeholder="예: 1,000,000,000"
              description="은행 대출, 회사채 등 이자 발생 부채"
            />

            <CurrencyInput
              id="cash"
              label={<span className="text-slate-700">현금 및 현금성 자산</span>}
              value={formData.cash}
              onChange={(value) => updateField("cash", value)}
              placeholder="예: 500,000,000"
            />
          </div>

          {/* 경고 메시지 */}
          {warnings.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* 에러 메시지 */}
          {errors.general && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-base font-semibold bg-slate-800 hover:bg-slate-700 text-white"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                분석 진행 중...
              </>
            ) : (
              <>
                <Briefcase className="mr-2 h-5 w-5" />
                기업가치 분석
              </>
            )}
          </Button>

          <p className="text-xs text-slate-400 text-center">
            입력하신 정보는 분석 목적으로만 사용되며, 안전하게 처리됩니다.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
