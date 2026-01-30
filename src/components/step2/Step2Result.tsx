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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Clock,
  Info,
  Percent,
  TrendingDown,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { Step2Result, ScenarioResult } from "@/lib/simulations/types";
import { formatKRWBillions, formatPercent } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface Step2ResultProps {
  result: Step2Result;
}

export function Step2Result({ result }: Step2ResultProps) {
  const [selectedScenarioIndex, setSelectedScenarioIndex] = React.useState(
    // 100% 시나리오가 있으면 선택, 없으면 마지막
    result.scenarios.findIndex((s) => s.equityPct === 100) !== -1
      ? result.scenarios.findIndex((s) => s.equityPct === 100)
      : result.scenarios.length - 1
  );

  const selectedScenario = result.scenarios[selectedScenarioIndex];

  // 차트 데이터 준비 - 시나리오별 PV 비교
  const pvComparisonData = result.scenarios.map((s) => ({
    name: `${s.equityPct}%`,
    "총 수령액": s.totalProceeds / 100_000_000,
    "현재가치(PV)": s.pv / 100_000_000,
  }));

  // 선택 시나리오의 연도별 현금흐름
  const cashflowData = selectedScenario.cashflows.map((cf, t) => ({
    year: `t=${t}`,
    label: t === 0 ? "즉시" : t === result.basis.lockInYears ? `${t}년(종료)` : `${t}년`,
    amount: cf / 100_000_000,
  }));

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">현재가치 (PV)</p>
                <p className="text-2xl font-bold text-primary">
                  {formatKRWBillions(selectedScenario.pv)} 원
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              지분 {selectedScenario.equityPct}% 기준
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">즉시 수령액 (t=0)</p>
                <p className="text-2xl font-bold">
                  {formatKRWBillions(selectedScenario.kpis.immediateAmount)} 원
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              총액의 {result.basis.payout.upfrontPct}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">PV / 총액 비율</p>
                <p className="text-2xl font-bold">
                  {(selectedScenario.kpis.pvToTotalRatio * 100).toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              시간가치 손실: {((1 - selectedScenario.kpis.pvToTotalRatio) * 100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 시나리오 선택 탭 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">시나리오 선택</CardTitle>
          <CardDescription>분석할 지분율을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.scenarios.map((s, idx) => (
              <Button
                key={idx}
                variant={selectedScenarioIndex === idx ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedScenarioIndex(idx)}
              >
                {s.equityPct}%
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 시나리오 비교 표 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">시나리오별 비교</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">지분율</th>
                  <th className="text-right py-2 px-2 font-medium">총 수령액</th>
                  <th className="text-right py-2 px-2 font-medium">현재가치(PV)</th>
                  <th className="text-right py-2 px-2 font-medium">즉시(t=0)</th>
                  <th className="text-right py-2 px-2 font-medium">종료시점</th>
                  <th className="text-right py-2 px-2 font-medium">PV/총액</th>
                </tr>
              </thead>
              <tbody>
                {result.scenarios.map((s, idx) => (
                  <tr
                    key={idx}
                    className={cn(
                      "border-b cursor-pointer transition-colors",
                      selectedScenarioIndex === idx
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedScenarioIndex(idx)}
                  >
                    <td className="py-2 px-2 font-medium">{s.equityPct}%</td>
                    <td className="text-right py-2 px-2">
                      {formatKRWBillions(s.totalProceeds)}
                    </td>
                    <td className="text-right py-2 px-2 text-primary font-medium">
                      {formatKRWBillions(s.pv)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatKRWBillions(s.kpis.immediateAmount)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatKRWBillions(s.kpis.finalAmount)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {(s.kpis.pvToTotalRatio * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 차트: 시나리오별 PV 비교 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">지분율별 가치 비교</CardTitle>
          <CardDescription>총 수령액 vs 현재가치(PV)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pvComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis
                  tickFormatter={(value) => `${value}억`}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}억 원`, ""]}
                />
                <Legend />
                <Bar dataKey="총 수령액" fill="#94a3b8" />
                <Bar dataKey="현재가치(PV)" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 차트: 연도별 현금흐름 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">연도별 현금흐름</CardTitle>
          <CardDescription>
            지분 {selectedScenario.equityPct}% 시나리오 기준
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis
                  tickFormatter={(value) => `${value}억`}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}억 원`, "수령액"]}
                />
                <Bar dataKey="amount" fill="#22c55e" name="수령액" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 가정/계산 근거 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-4 w-4" />
            가정 및 계산 근거
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">기준 가격</p>
              <p className="font-semibold">
                {result.basis.valuationBasis === "low"
                  ? "보수적"
                  : result.basis.valuationBasis === "high"
                  ? "낙관적"
                  : "중간"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatKRWBillions(result.basis.equityBasisValue)}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Lock-in 기간</p>
              <p className="font-semibold">{result.basis.lockInYears}년</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">할인율</p>
              <p className="font-semibold">
                {(result.basis.discountRate * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">지급 구조</p>
              <p className="font-semibold text-xs">
                {result.basis.payout.upfrontPct}/{result.basis.payout.escrowPct}/{result.basis.payout.earnoutPct}
              </p>
              <p className="text-xs text-muted-foreground">
                즉시/Escrow/Earnout
              </p>
            </div>
          </div>

          <Separator />

          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm leading-relaxed">{result.explainText}</p>
          </div>

          {/* 경고 */}
          {result.warnings.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-sm">주의사항</AlertTitle>
              <AlertDescription>
                <ul className="text-xs list-disc list-inside space-y-1 mt-1">
                  {result.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* CTA 카드 */}
      <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
        <CardContent className="pt-6">
          <h3 className="text-xl font-bold mb-2">
            세금 효과와 최종 순수익이 궁금하신가요?
          </h3>
          <p className="text-sm opacity-90 mb-4">
            3단계에서 양도소득세, 법인세 효과까지 반영한 최종 순수익(Net Proceeds)을 계산합니다.
          </p>
          <Link href="/app/step3">
            <Button
              size="lg"
              variant="secondary"
              className="w-full font-semibold"
            >
              3단계(세금/순수익)로 진행
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
