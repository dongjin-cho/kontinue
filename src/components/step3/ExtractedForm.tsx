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
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import type { Document, ExtractedFinancials } from "@/lib/supabase/types";
import { formatInputValue, parseNumberFromString } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface ExtractedFormProps {
  document: Document;
  onVerified: (doc: Document) => void;
}

interface FinancialField {
  key: keyof ExtractedFinancials;
  label: string;
  description?: string;
}

const FINANCIAL_FIELDS: FinancialField[] = [
  { key: "revenue", label: "매출액", description: "연간 총 매출" },
  { key: "gross_profit", label: "매출총이익", description: "매출 - 매출원가" },
  { key: "operating_income", label: "영업이익", description: "영업활동 수익" },
  { key: "ebitda", label: "EBITDA", description: "영업이익 + 감가상각비" },
  { key: "net_income", label: "순이익", description: "세후 최종 이익" },
  { key: "assets", label: "총자산", description: "자산 총계" },
  { key: "liabilities", label: "총부채", description: "부채 총계" },
  { key: "cash", label: "현금 및 현금성 자산", description: "유동 현금" },
  { key: "total_debt", label: "총 차입금", description: "이자 발생 부채" },
];

export function ExtractedForm({ document, onVerified }: ExtractedFormProps) {
  const [formData, setFormData] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 초기 데이터 로드
  React.useEffect(() => {
    const extracted = document.extracted_json;
    if (extracted) {
      const initial: Record<string, string> = {};
      FINANCIAL_FIELDS.forEach((field) => {
        const value = extracted[field.key];
        if (value !== undefined && value !== null) {
          initial[field.key] = formatInputValue(String(value));
        } else {
          initial[field.key] = "";
        }
      });
      setFormData(initial);
    }
  }, [document.extracted_json]);

  const handleChange = (key: string, value: string) => {
    // 숫자만 허용하고 콤마 포맷팅
    const numericValue = value.replace(/[^0-9]/g, "");
    setFormData((prev) => ({
      ...prev,
      [key]: numericValue ? formatInputValue(numericValue) : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // 숫자로 변환
      const verified: Record<string, number | string | undefined> = {};
      FINANCIAL_FIELDS.forEach((field) => {
        const value = formData[field.key];
        if (value) {
          verified[field.key] = parseNumberFromString(value);
        }
      });

      const response = await fetch("/api/document/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          verified,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "검증 저장 실패");
      }

      // 상태 업데이트
      onVerified({
        ...document,
        status: "verified",
        verified_json: verified as ExtractedFinancials,
      });
    } catch (err) {
      console.error("Verify error:", err);
      setError(
        err instanceof Error ? err.message : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 이미 검증 완료된 경우
  if (document.status === "verified") {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            재무 데이터 검증 완료
          </CardTitle>
          <CardDescription>
            검증된 재무 데이터가 저장되었습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FINANCIAL_FIELDS.map((field) => {
              const value = document.verified_json?.[field.key];
              if (value === undefined || value === null) return null;
              return (
                <div key={field.key} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{field.label}</p>
                  <p className="font-medium">
                    {formatInputValue(String(value))} 원
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // parsed 상태가 아니면 표시하지 않음
  if (document.status !== "parsed") {
    return null;
  }

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
        {/* 경고 문구 */}
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">확인 필요</AlertTitle>
          <AlertDescription>
            자동 추출 결과는 100% 정확하지 않을 수 있습니다. 원본 재무제표와
            비교하여 확인해주세요.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FINANCIAL_FIELDS.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                </Label>
                <div className="relative">
                  <Input
                    id={field.key}
                    type="text"
                    inputMode="numeric"
                    value={formData[field.key] || ""}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder="0"
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    원
                  </span>
                </div>
                {field.description && (
                  <p className="text-xs text-muted-foreground">
                    {field.description}
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Separator />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
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
