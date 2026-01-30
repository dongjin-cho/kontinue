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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Document } from "@/lib/supabase/types";
import type { 
  ExtractedFinancialData, 
  NormalizedSummary,
  IncomeStatement,
  BalanceSheet,
  CashFlowStatement,
} from "@/lib/supabase/financial-schema";
import { createNormalizedSummary } from "@/lib/supabase/financial-schema";
import { formatInputValue, parseNumberFromString, formatKRWBillions } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface ExtractedFormV2Props {
  document: Document;
  onVerified: (doc: Document) => void;
}

type StatementType = "income_statement" | "balance_sheet" | "cash_flow";

const INCOME_FIELDS = [
  { key: "revenue", label: "매출액", required: true },
  { key: "cost_of_sales", label: "매출원가" },
  { key: "gross_profit", label: "매출총이익" },
  { key: "sg_and_a", label: "판매비와관리비" },
  { key: "operating_income", label: "영업이익", required: true },
  { key: "depreciation_amortization", label: "감가상각비" },
  { key: "ebitda", label: "EBITDA" },
  { key: "net_income", label: "당기순이익", required: true },
];

const BALANCE_FIELDS = [
  { key: "assets_total", label: "자산총계", required: true },
  { key: "assets_current", label: "유동자산" },
  { key: "cash_and_equivalents", label: "현금및현금성자산", required: true },
  { key: "accounts_receivable", label: "매출채권" },
  { key: "inventory", label: "재고자산" },
  { key: "liabilities_total", label: "부채총계", required: true },
  { key: "liabilities_current", label: "유동부채" },
  { key: "borrowings_short", label: "단기차입금" },
  { key: "borrowings_long", label: "장기차입금" },
  { key: "equity_total", label: "자본총계" },
];

const CASHFLOW_FIELDS = [
  { key: "net_cash_from_operating", label: "영업활동현금흐름" },
  { key: "net_cash_from_investing", label: "투자활동현금흐름" },
  { key: "net_cash_from_financing", label: "재무활동현금흐름" },
  { key: "capex", label: "유형자산취득" },
  { key: "ending_cash", label: "기말현금" },
];

export function ExtractedFormV2({ document, onVerified }: ExtractedFormV2Props) {
  const extracted = document.extracted_json as ExtractedFinancialData | null;
  
  const [selectedPeriod, setSelectedPeriod] = React.useState(
    document.selected_period_id || extracted?.periods[0]?.period_id || ""
  );
  const [unitLabel, setUnitLabel] = React.useState(
    extracted?.meta.unit_label || "원"
  );
  const [formData, setFormData] = React.useState<Record<string, Record<string, string>>>({
    income_statement: {},
    balance_sheet: {},
    cash_flow: {},
  });
  const [expandedSections, setExpandedSections] = React.useState<StatementType[]>([
    "income_statement",
    "balance_sheet",
  ]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 초기 데이터 로드
  React.useEffect(() => {
    if (extracted && selectedPeriod) {
      const multiplier = extracted.meta.unit_multiplier;
      const income = extracted.statements.income_statement[selectedPeriod];
      const balance = extracted.statements.balance_sheet[selectedPeriod];
      const cashflow = extracted.statements.cash_flow[selectedPeriod];

      const formatValue = (value: number | null) => {
        if (value === null) return "";
        // 표시 단위로 변환
        const displayValue = value * multiplier;
        return formatInputValue(String(displayValue));
      };

      setFormData({
        income_statement: income
          ? Object.fromEntries(
              INCOME_FIELDS.map((f) => [f.key, formatValue(income[f.key as keyof typeof income] as number | null)])
            )
          : {},
        balance_sheet: balance
          ? Object.fromEntries(
              BALANCE_FIELDS.map((f) => [f.key, formatValue(balance[f.key as keyof typeof balance] as number | null)])
            )
          : {},
        cash_flow: cashflow
          ? Object.fromEntries(
              CASHFLOW_FIELDS.map((f) => [f.key, formatValue(cashflow[f.key as keyof typeof cashflow] as number | null)])
            )
          : {},
      });
    }
  }, [extracted, selectedPeriod]);

  const handleChange = (section: StatementType, key: string, value: string) => {
    const numericValue = value.replace(/[^0-9-]/g, "");
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: numericValue ? formatInputValue(numericValue) : "",
      },
    }));
  };

  const toggleSection = (section: StatementType) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 숫자로 변환 (원 단위로 정규화)
      const parseValue = (value: string): number | null => {
        if (!value) return null;
        return parseNumberFromString(value);
      };

      const verifiedData: ExtractedFinancialData = {
        schema_version: "kr-fin-v1",
        meta: {
          ...extracted?.meta,
          company_name: extracted?.meta.company_name || null,
          source_type: extracted?.meta.source_type || "unknown",
          currency: "KRW",
          unit_label: "원",
          unit_multiplier: 1, // verified는 항상 원 단위
          fiscal_year_end_month: extracted?.meta.fiscal_year_end_month || 12,
        },
        periods: extracted?.periods || [],
        statements: {
          income_statement: {
            [selectedPeriod]: Object.fromEntries(
              INCOME_FIELDS.map((f) => [f.key, parseValue(formData.income_statement[f.key] || "")])
            ) as unknown as IncomeStatement,
          },
          balance_sheet: {
            [selectedPeriod]: Object.fromEntries(
              BALANCE_FIELDS.map((f) => [f.key, parseValue(formData.balance_sheet[f.key] || "")])
            ) as unknown as BalanceSheet,
          },
          cash_flow: {
            [selectedPeriod]: Object.fromEntries(
              CASHFLOW_FIELDS.map((f) => [f.key, parseValue(formData.cash_flow[f.key] || "")])
            ) as unknown as CashFlowStatement,
          },
        },
      };

      const response = await fetch("/api/document/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          verified: verifiedData,
          selectedPeriodId: selectedPeriod,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "검증 저장 실패");
      }

      onVerified({
        ...document,
        status: "verified",
        verified_json: verifiedData as unknown as Record<string, unknown>,
        selected_period_id: selectedPeriod,
      });
    } catch (err) {
      console.error("Verify error:", err);
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 이미 검증 완료된 경우
  if (document.status === "verified") {
    const summary = document.normalized_summary as NormalizedSummary | null;
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            재무 데이터 검증 완료
          </CardTitle>
          <CardDescription>
            {summary?.period_label} 기준 검증 데이터가 저장되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">매출액</p>
                <p className="font-medium">{formatKRWBillions(summary.revenue || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">영업이익</p>
                <p className="font-medium">{formatKRWBillions(summary.operating_income || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">EBITDA</p>
                <p className="font-medium">{formatKRWBillions(summary.ebitda || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">순이익</p>
                <p className="font-medium">{formatKRWBillions(summary.net_income || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총차입금</p>
                <p className="font-medium">{formatKRWBillions(summary.total_debt || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">현금</p>
                <p className="font-medium">{formatKRWBillions(summary.cash_and_equivalents || 0)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (document.status !== "parsed" || !extracted) {
    return null;
  }

  const renderSection = (
    type: StatementType,
    title: string,
    fields: { key: string; label: string; required?: boolean }[]
  ) => {
    const isExpanded = expandedSections.includes(type);
    const data = formData[type];

    return (
      <div key={type} className="border rounded-lg">
        <button
          type="button"
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
          onClick={() => toggleSection(type)}
        >
          <span className="font-medium">{title}</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {isExpanded && (
          <div className="p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  {field.label}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={data[field.key] || ""}
                    onChange={(e) => handleChange(type, field.key, e.target.value)}
                    placeholder="0"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    원
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" />
          추출값 검증/수정
        </CardTitle>
        <CardDescription>
          자동 추출된 재무 데이터를 확인하고 필요시 수정해주세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">확인 필요</AlertTitle>
          <AlertDescription>
            자동 추출 결과는 100% 정확하지 않을 수 있습니다. 원본 재무제표와 비교하여 확인해주세요.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기간 선택 */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>모델링 기간 선택</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="기간 선택" />
                </SelectTrigger>
                <SelectContent>
                  {extracted.periods.map((p) => (
                    <SelectItem key={p.period_id} value={p.period_id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>단위</Label>
              <Badge variant="secondary" className="h-10 px-4 flex items-center">
                {unitLabel}
              </Badge>
            </div>
          </div>

          {/* 재무제표 섹션들 */}
          <div className="space-y-4">
            {renderSection("income_statement", "손익계산서", INCOME_FIELDS)}
            {renderSection("balance_sheet", "재무상태표", BALANCE_FIELDS)}
            {renderSection("cash_flow", "현금흐름표", CASHFLOW_FIELDS)}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Separator />

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                확정 저장
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
