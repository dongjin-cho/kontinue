"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Calculator, Loader2 } from "lucide-react";
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
      newErrors.industry = "산업 분류를 선택해주세요";
    }
    if (!formData.foundedYear) {
      newErrors.foundedYear = "설립연도를 입력해주세요";
    } else {
      const year = parseInt(formData.foundedYear);
      if (year > currentYear) {
        newErrors.foundedYear = "설립연도는 현재 연도보다 클 수 없습니다";
      } else if (year < 1900) {
        newErrors.foundedYear = "올바른 설립연도를 입력해주세요";
      }
    }
    if (!formData.employeeBand) {
      newErrors.employeeBand = "직원 수 구간을 선택해주세요";
    }
    if (formData.revenue <= 0) {
      newErrors.revenue = "매출액을 입력해주세요";
    }
    if (formData.revenueGrowth === "") {
      newErrors.revenueGrowth = "매출 성장률을 입력해주세요";
    } else {
      const growth = parseFloat(formData.revenueGrowth);
      if (growth < -100 || growth > 300) {
        newErrors.revenueGrowth = "성장률은 -100% ~ 300% 범위 내여야 합니다";
      }
    }

    // Consistency warnings
    if (formData.revenue > 0) {
      if (Math.abs(formData.ebitda) > formData.revenue * 0.5) {
        newWarnings.push("EBITDA가 매출액의 50%를 초과합니다. 입력값을 확인해주세요.");
      }
      if (Math.abs(formData.netIncome) > formData.revenue * 0.5) {
        newWarnings.push("순이익이 매출액의 50%를 초과합니다. 입력값을 확인해주세요.");
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
          기업 정보 입력
        </CardTitle>
        <CardDescription>
          최소한의 정보로 귀사의 대략적인 기업가치를 산출합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
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
              <p className="text-xs text-destructive">{errors.industry}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="foundedYear" className="text-sm font-medium">
                  설립연도 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="foundedYear"
                  type="number"
                  placeholder="예: 2015"
                  value={formData.foundedYear}
                  onChange={(e) => updateField("foundedYear", e.target.value)}
                  min={1900}
                  max={new Date().getFullYear()}
                  className={cn("h-12", errors.foundedYear && "border-destructive")}
                />
                {errors.foundedYear && (
                  <p className="text-xs text-destructive">{errors.foundedYear}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  직원 수 <span className="text-destructive">*</span>
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
                          "flex w-full cursor-pointer items-center justify-center rounded border px-2 py-2 text-xs font-medium transition-all",
                          "hover:bg-accent",
                          "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                        )}
                      >
                        {band.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {errors.employeeBand && (
                  <p className="text-xs text-destructive">{errors.employeeBand}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* 재무 성과 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              재무 성과
            </h3>

            <CurrencyInput
              id="revenue"
              label="최근 연 매출액"
              value={formData.revenue}
              onChange={(value) => updateField("revenue", value)}
              placeholder="예: 5,000,000,000"
              required
              error={errors.revenue}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  EBITDA / 영업이익 <span className="text-destructive">*</span>
                </Label>
                <RadioGroup
                  value={formData.ebitdaType}
                  onValueChange={(v) => updateField("ebitdaType", v as "EBITDA" | "영업이익")}
                  className="flex gap-3"
                >
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="EBITDA" id="type-ebitda" />
                    <Label htmlFor="type-ebitda" className="text-xs cursor-pointer">
                      EBITDA
                    </Label>
                  </div>
                  <div className="flex items-center gap-1">
                    <RadioGroupItem value="영업이익" id="type-op" />
                    <Label htmlFor="type-op" className="text-xs cursor-pointer">
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
                description="적자인 경우 0으로 입력해주세요"
                allowNegative
              />
            </div>

            <CurrencyInput
              id="netIncome"
              label="순이익"
              value={formData.netIncome}
              onChange={(value) => updateField("netIncome", value)}
              placeholder="예: 500,000,000"
              allowNegative
            />

            <div className="space-y-2">
              <Label htmlFor="revenueGrowth" className="text-sm font-medium">
                매출 성장률 (전년 대비) <span className="text-destructive">*</span>
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
                  className={cn("pr-8 h-12", errors.revenueGrowth && "border-destructive")}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  %
                </span>
              </div>
              {errors.revenueGrowth && (
                <p className="text-xs text-destructive">{errors.revenueGrowth}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* 부채 및 현금 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              부채 및 현금
            </h3>

            <CurrencyInput
              id="totalDebt"
              label="총 차입금"
              value={formData.totalDebt}
              onChange={(value) => updateField("totalDebt", value)}
              placeholder="예: 1,000,000,000"
              description="은행 대출, 회사채 등 이자 발생 부채"
            />

            <CurrencyInput
              id="cash"
              label="현금 및 현금성 자산"
              value={formData.cash}
              onChange={(value) => updateField("cash", value)}
              placeholder="예: 500,000,000"
            />
          </div>

          {/* 경고 메시지 */}
          {warnings.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm">
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
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
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
                계산 중...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-5 w-5" />
                기업가치 계산하기
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
