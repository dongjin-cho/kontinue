"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  ArrowRight,
  TrendingUp,
  Wallet,
  PiggyBank,
  AlertTriangle,
  Info,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import type { Step2V2Result, ScenarioV2Result, CaseResult } from "@/lib/simulations/types_v2";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface Step2ResultV2Props {
  result: Step2V2Result;
}

type CaseType = "guaranteed" | "expected" | "best";

const CASE_LABELS: Record<CaseType, { label: string; color: string; description: string }> = {
  guaranteed: {
    label: "Guaranteed",
    color: "#6b7280",
    description: "즉시 지급분만 (최악 케이스)",
  },
  expected: {
    label: "Expected",
    color: "#3b82f6",
    description: "확률 반영 기대값",
  },
  best: {
    label: "Best",
    color: "#22c55e",
    description: "100% 달성 가정",
  },
};

export function Step2ResultV2({ result }: Step2ResultV2Props) {
  const [selectedCase, setSelectedCase] = React.useState<CaseType>("expected");
  const [selectedScenarioIdx, setSelectedScenarioIdx] = React.useState(
    result.scenarios.length - 1
  );

  const selectedScenario = result.scenarios[selectedScenarioIdx];
  const selectedCaseData = selectedScenario?.cases[selectedCase];

  // PV 비교 차트 데이터
  const pvComparisonData = result.scenarios.map((s) => ({
    name: `${s.equityPct}%`,
    Guaranteed: s.cases.guaranteed.pv,
    Expected: s.cases.expected.pv,
    Best: s.cases.best.pv,
  }));

  // 연도별 현금흐름 차트 데이터
  const cashflowData = selectedCaseData?.cashflows.map((cf, t) => ({
    year: `t=${t}`,
    label: t === 0 ? "즉시" : t === result.basis.lockInYears ? `${t}년(종료)` : `${t}년`,
    amount: cf,
  })) || [];

  return (
    <div className="space-y-6">
      {/* 케이스 선택 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">케이스 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedCase}
            onValueChange={(v) => setSelectedCase(v as CaseType)}
            className="grid grid-cols-3 gap-2"
          >
            {(Object.keys(CASE_LABELS) as CaseType[]).map((caseType) => {
              const config = CASE_LABELS[caseType];
              return (
                <div key={caseType}>
                  <RadioGroupItem
                    value={caseType}
                    id={`case-${caseType}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`case-${caseType}`}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 cursor-pointer",
                      "hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary"
                    )}
                  >
                    <span
                      className="font-medium"
                      style={{ color: config.color }}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center">
                      {config.description}
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* KPI 카드 */}
      {selectedCaseData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-primary mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium inline-flex items-center">
                  현재가치 (PV)
                  <InfoTooltip term="현재가치" />
                </span>
              </div>
              <p className="text-2xl font-bold">
                {formatKRWBillions(selectedCaseData.pv)}
              </p>
              <p className="text-sm text-muted-foreground">
                지분 {selectedScenario.equityPct}% 기준
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Wallet className="h-5 w-5" />
                <span className="font-medium">즉시 수령액</span>
              </div>
              <p className="text-2xl font-bold">
                {formatKRWBillions(selectedCaseData.kpis.immediateAmount)}
              </p>
              <p className="text-sm text-muted-foreground">t=0 시점</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <PiggyBank className="h-5 w-5" />
                <span className="font-medium">PV/총액 비율</span>
              </div>
              <p className="text-2xl font-bold">
                {(selectedCaseData.kpis.pvToTotalRatio * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">시간가치 반영</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 시나리오 비교 표 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            시나리오 비교
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">지분</th>
                  <th className="text-right py-2 px-3">총액</th>
                  <th className="text-right py-2 px-3">PV ({CASE_LABELS[selectedCase].label})</th>
                  <th className="text-right py-2 px-3">t=0</th>
                  <th className="text-right py-2 px-3">t=N</th>
                  <th className="text-right py-2 px-3">PV/총액</th>
                </tr>
              </thead>
              <tbody>
                {result.scenarios.map((scenario, idx) => {
                  const caseData = scenario.cases[selectedCase];
                  const isSelected = idx === selectedScenarioIdx;
                  return (
                    <tr
                      key={scenario.equityPct}
                      className={cn(
                        "border-b cursor-pointer hover:bg-muted/50",
                        isSelected && "bg-primary/10"
                      )}
                      onClick={() => setSelectedScenarioIdx(idx)}
                    >
                      <td className="py-2 px-3 font-medium">{scenario.equityPct}%</td>
                      <td className="py-2 px-3 text-right">
                        {formatKRWBillions(caseData.totalNominal)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        {formatKRWBillions(caseData.pv)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatKRWBillions(caseData.kpis.immediateAmount)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatKRWBillions(caseData.kpis.finalAmount)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {(caseData.kpis.pvToTotalRatio * 100).toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            행을 클릭하면 해당 시나리오의 상세 현금흐름을 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      {/* PV 비교 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>케이스별 PV 비교</CardTitle>
          <CardDescription>지분 시나리오별 현재가치 비교</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pvComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) =>
                    value >= 100000000 ? `${(value / 100000000).toFixed(0)}억` : `${(value / 10000).toFixed(0)}만`
                  }
                />
                <Tooltip
                  formatter={(value) => [formatKRWBillions(Number(value)), ""]}
                />
                <Legend />
                <Bar dataKey="Guaranteed" fill={CASE_LABELS.guaranteed.color} />
                <Bar dataKey="Expected" fill={CASE_LABELS.expected.color} />
                <Bar dataKey="Best" fill={CASE_LABELS.best.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 연도별 현금흐름 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>연도별 현금흐름</CardTitle>
          <CardDescription>
            지분 {selectedScenario?.equityPct}% / {CASE_LABELS[selectedCase].label} 케이스
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis
                  tickFormatter={(value) =>
                    value >= 100000000 ? `${(value / 100000000).toFixed(0)}억` : `${(value / 10000).toFixed(0)}만`
                  }
                />
                <Tooltip
                  formatter={(value) => [formatKRWBillions(Number(value)), "수령액"]}
                />
                <Bar dataKey="amount" fill={CASE_LABELS[selectedCase].color}>
                  {cashflowData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#22c55e" : CASE_LABELS[selectedCase].color}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 경고 */}
      {result.warnings.length > 0 && (
        <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 설명 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            분석 설명
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {result.explainText}
          </p>
        </CardContent>
      </Card>

      {/* 가정 요약 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">가정/계산 근거</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">기준 가치</p>
              <p className="font-medium">
                {formatKRWBillions(result.basis.equityBasisValue)} ({result.basis.valuationBasis})
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Lock-in</p>
              <p className="font-medium">{result.basis.lockInYears}년</p>
            </div>
            <div>
              <p className="text-muted-foreground">할인율</p>
              <p className="font-medium">{(result.basis.discountRate * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">지급 구조</p>
              <p className="font-medium">
                {result.basis.payout.upfrontPct}/{result.basis.payout.escrowPct}/{result.basis.payout.earnoutPct}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* CTA */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">재무제표를 업로드하고 더 정확한 분석을 받아보세요</h3>
              <p className="text-sm text-muted-foreground">
                실제 재무제표 데이터로 검증하고 전문 중개법인과 연결됩니다.
              </p>
            </div>
            <Link href="/app/step3">
              <Button size="lg" className="gap-2">
                Step 3로 진행
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
