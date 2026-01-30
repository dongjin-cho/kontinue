"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Wallet,
  AlertTriangle,
  Info,
  DollarSign,
  Clock,
  HelpCircle,
  Building2,
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
  Cell,
} from "recharts";
import type {
  DealScenarioOutput,
  ScenarioResult,
  ScenarioCode,
} from "@/lib/deal/scenarios";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface DealScenarioResultsProps {
  result: DealScenarioOutput;
}

type ViewMode = "afterFees" | "beforeFees" | "afterTax";

const CHART_COLORS = {
  immediateCash: "#22c55e", // green
  deferredCash: "#3b82f6", // blue
  conditionalCash: "#f59e0b", // amber
  stockValue: "#8b5cf6", // purple
  retainedValue: "#6b7280", // gray
  corporateCash: "#06b6d4", // cyan
};

export function DealScenarioResults({ result }: DealScenarioResultsProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("afterFees");
  const [selectedScenario, setSelectedScenario] = React.useState<ScenarioCode | null>(null);

  const { scenarios, top3, scoring, warnings, baseEquityMedian } = result;

  // 시나리오 정렬: Top3 먼저, 나머지는 점수순
  const sortedScenarios = React.useMemo(() => {
    return [...scenarios].sort((a, b) => {
      const aRank = top3.indexOf(a.code);
      const bRank = top3.indexOf(b.code);
      if (aRank >= 0 && bRank >= 0) return aRank - bRank;
      if (aRank >= 0) return -1;
      if (bRank >= 0) return 1;
      return (scoring[b.code]?.total || 0) - (scoring[a.code]?.total || 0);
    });
  }, [scenarios, top3, scoring]);

  // 차트 데이터 생성
  const chartData = React.useMemo(() => {
    return sortedScenarios
      .filter((s) => s.isFounderCashoutCalculable)
      .map((s) => {
        const { breakdown, netBreakdown } = s;
        const feeMultiplier = viewMode === "beforeFees" ? 1 : (1 - (result.inputsEcho.feeRate || 0.03));
        const taxMultiplier = viewMode === "afterTax" ? (1 - (result.inputsEcho.taxRate || 0)) : 1;
        const multiplier = feeMultiplier * taxMultiplier;

        return {
          name: s.name.length > 8 ? s.name.slice(0, 8) + "..." : s.name,
          code: s.code,
          즉시현금: Math.round(breakdown.immediateCash * multiplier / 1e8) / 10,
          지연현금: Math.round(breakdown.deferredCash * multiplier / 1e8) / 10,
          조건부현금: Math.round(breakdown.conditionalCashExpected * multiplier / 1e8) / 10,
          주식가치: Math.round(breakdown.stockValue / 1e8) / 10,
          롤오버가치: Math.round(breakdown.retainedValue / 1e8) / 10,
          총합: Math.round(
            (breakdown.immediateCash + breakdown.deferredCash + breakdown.conditionalCashExpected + breakdown.stockValue) * multiplier / 1e8
          ) / 10,
        };
      });
  }, [sortedScenarios, viewMode, result.inputsEcho]);

  // 비교 막대 차트 데이터
  const comparisonData = React.useMemo(() => {
    return sortedScenarios
      .filter((s) => s.isFounderCashoutCalculable)
      .map((s) => ({
        name: s.name.length > 6 ? s.name.slice(0, 6) + "..." : s.name,
        code: s.code,
        "기대 순수익": Math.round(s.netBreakdown.founderNetExpected / 1e8) / 10,
        isTop3: top3.includes(s.code),
      }));
  }, [sortedScenarios, top3]);

  const getRankBadge = (code: ScenarioCode) => {
    const rank = top3.indexOf(code);
    if (rank === 0) return <Badge className="bg-yellow-500 text-white">1위 추천</Badge>;
    if (rank === 1) return <Badge className="bg-gray-400 text-white">2위</Badge>;
    if (rank === 2) return <Badge className="bg-amber-600 text-white">3위</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <ul className="list-disc list-inside">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 기준 정보 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">시나리오 분석 결과</CardTitle>
          <CardDescription>
            기준 Equity Value: {formatKRWBillions(baseEquityMedian)} (Median)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label className="text-sm">표시 기준:</Label>
            <RadioGroup
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-1">
                <RadioGroupItem value="beforeFees" id="view-gross" />
                <Label htmlFor="view-gross" className="text-xs cursor-pointer">
                  수수료 전
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <RadioGroupItem value="afterFees" id="view-fee" />
                <Label htmlFor="view-fee" className="text-xs cursor-pointer">
                  수수료 후
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <RadioGroupItem value="afterTax" id="view-tax" />
                <Label htmlFor="view-tax" className="text-xs cursor-pointer">
                  세후
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Top 3 추천 */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            추천 딜 구조 Top 3
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {top3.map((code, idx) => {
              const scenario = scenarios.find((s) => s.code === code);
              if (!scenario) return null;

              return (
                <div
                  key={code}
                  className={cn(
                    "p-4 rounded-lg border-2 cursor-pointer transition-all",
                    idx === 0
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-muted bg-background hover:border-primary/50",
                    selectedScenario === code && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedScenario(code === selectedScenario ? null : code)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{scenario.name}</span>
                    {getRankBadge(code)}
                  </div>
                  {scenario.isFounderCashoutCalculable ? (
                    <div className="text-2xl font-bold text-primary">
                      {formatKRWBillions(scenario.netBreakdown.founderNetExpected)}
                    </div>
                  ) : (
                    <div className="text-lg text-muted-foreground">계산 불가</div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {scenario.explanation.slice(0, 60)}...
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 비교 차트: Founder Net */}
      <Card>
        <CardHeader>
          <CardTitle>시나리오별 기대 순수익 비교</CardTitle>
          <CardDescription>창업자 기준 (수수료 차감 후)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => `${v}억`} />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip
                  formatter={(value: number) => [`${value}억 원`, "기대 순수익"]}
                />
                <Bar dataKey="기대 순수익" radius={[0, 4, 4, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isTop3 ? "#3b82f6" : "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 스택 바 차트: 구성요소 */}
      <Card>
        <CardHeader>
          <CardTitle>시나리오별 수령액 구성</CardTitle>
          <CardDescription>즉시/지연/조건부/주식/롤오버</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(v) => `${v}억`} />
                <Tooltip formatter={(value: number) => [`${value}억 원`]} />
                <Legend />
                <Bar dataKey="즉시현금" stackId="a" fill={CHART_COLORS.immediateCash} name="즉시 현금" />
                <Bar dataKey="지연현금" stackId="a" fill={CHART_COLORS.deferredCash} name="지연 현금" />
                <Bar dataKey="조건부현금" stackId="a" fill={CHART_COLORS.conditionalCash} name="조건부(기대)" />
                <Bar dataKey="주식가치" stackId="a" fill={CHART_COLORS.stockValue} name="주식 가치" />
                <Bar dataKey="롤오버가치" stackId="a" fill={CHART_COLORS.retainedValue} name="롤오버" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 시나리오 상세 카드 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">전체 시나리오 상세</h2>
        {sortedScenarios.map((scenario) => (
          <ScenarioDetailCard
            key={scenario.code}
            scenario={scenario}
            rank={top3.indexOf(scenario.code)}
            score={scoring[scenario.code]}
            viewMode={viewMode}
            isExpanded={selectedScenario === scenario.code}
            onToggle={() =>
              setSelectedScenario(
                selectedScenario === scenario.code ? null : scenario.code
              )
            }
          />
        ))}
      </div>

      {/* 고지 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          본 시뮬레이션은 참고용이며 실제 거래 구조/세금/수수료는 계약 및 개인 상황에 따라 달라질 수 있습니다.
          정확한 세금 계산은 세무사와 상담하시기 바랍니다.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// 시나리오 상세 카드
interface ScenarioDetailCardProps {
  scenario: ScenarioResult;
  rank: number;
  score: { cashNow: number; upside: number; risk: number; founderFit: number; total: number } | undefined;
  viewMode: ViewMode;
  isExpanded: boolean;
  onToggle: () => void;
}

function ScenarioDetailCard({
  scenario,
  rank,
  score,
  viewMode,
  isExpanded,
  onToggle,
}: ScenarioDetailCardProps) {
  const { breakdown, netBreakdown, eligible, eligibilityReasons, assumptions, pros, cons, explanation } = scenario;

  const getRankBadge = () => {
    if (rank === 0) return <Badge className="bg-yellow-500 text-white">1위 추천</Badge>;
    if (rank === 1) return <Badge className="bg-gray-400 text-white">2위</Badge>;
    if (rank === 2) return <Badge className="bg-amber-600 text-white">3위</Badge>;
    return null;
  };

  return (
    <Card className={cn(
      "transition-all",
      rank >= 0 && rank < 3 && "border-primary/30",
      !eligible && "opacity-60"
    )}>
      <CardHeader
        className="cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{scenario.name}</CardTitle>
            {getRankBadge()}
            {eligible ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                적합
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                부적합
              </Badge>
            )}
          </div>
          <div className="text-right">
            {scenario.isFounderCashoutCalculable ? (
              <>
                <div className="text-xl font-bold text-primary">
                  {formatKRWBillions(netBreakdown.founderNetExpected)}
                </div>
                <div className="text-xs text-muted-foreground">기대 순수익</div>
              </>
            ) : (
              <>
                <div className="text-lg text-muted-foreground">
                  {formatKRWBillions(breakdown.corporateCashIn || 0)}
                </div>
                <div className="text-xs text-muted-foreground">법인 유입액</div>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <Separator />

          {/* 적합성 */}
          <div>
            <h4 className="font-semibold text-sm mb-2">적합성 판단</h4>
            <ul className="text-sm space-y-1">
              {eligibilityReasons.map((reason, i) => (
                <li key={i} className="flex items-center gap-2">
                  {eligible ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* 가정값 */}
          <div>
            <h4 className="font-semibold text-sm mb-2">딜 구조 가정</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {assumptions.targetSaleRatio !== undefined && (
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">매각 비율</div>
                  <div className="font-medium">{(assumptions.targetSaleRatio * 100).toFixed(0)}%</div>
                </div>
              )}
              {assumptions.rolloverRatio !== undefined && (
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">롤오버</div>
                  <div className="font-medium">{(assumptions.rolloverRatio * 100).toFixed(0)}%</div>
                </div>
              )}
              {assumptions.cashRatio !== undefined && (
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">현금 비율</div>
                  <div className="font-medium">{(assumptions.cashRatio * 100).toFixed(0)}%</div>
                </div>
              )}
              {assumptions.stockRatio !== undefined && (
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">주식 비율</div>
                  <div className="font-medium">{(assumptions.stockRatio * 100).toFixed(0)}%</div>
                </div>
              )}
              {assumptions.basePaymentRatio !== undefined && (
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">기본 지급</div>
                  <div className="font-medium">{(assumptions.basePaymentRatio * 100).toFixed(0)}%</div>
                </div>
              )}
              {assumptions.earnoutRatio !== undefined && (
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">어닝아웃</div>
                  <div className="font-medium">{(assumptions.earnoutRatio * 100).toFixed(0)}%</div>
                </div>
              )}
              {assumptions.earnoutProbability !== undefined && (
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">달성 확률</div>
                  <div className="font-medium">{(assumptions.earnoutProbability * 100).toFixed(0)}%</div>
                </div>
              )}
              {assumptions.assetContributionRatio !== undefined && (
                <div className="p-2 bg-muted rounded">
                  <div className="text-muted-foreground text-xs">자산 기여율</div>
                  <div className="font-medium">{(assumptions.assetContributionRatio * 100).toFixed(0)}%</div>
                </div>
              )}
            </div>
          </div>

          {/* 수령액 분해 */}
          {scenario.isFounderCashoutCalculable && (
            <div>
              <h4 className="font-semibold text-sm mb-2">창업자 수령액 분해</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-1 text-green-700 text-xs mb-1">
                    <DollarSign className="h-3 w-3" />
                    즉시 현금
                  </div>
                  <div className="font-bold text-green-700">
                    {formatKRWBillions(breakdown.immediateCash)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-1 text-blue-700 text-xs mb-1">
                    <Clock className="h-3 w-3" />
                    지연 현금
                  </div>
                  <div className="font-bold text-blue-700">
                    {formatKRWBillions(breakdown.deferredCash)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-1 text-amber-700 text-xs mb-1">
                    <HelpCircle className="h-3 w-3" />
                    조건부 (기대)
                  </div>
                  <div className="font-bold text-amber-700">
                    {formatKRWBillions(breakdown.conditionalCashExpected)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-1 text-purple-700 text-xs mb-1">
                    <TrendingUp className="h-3 w-3" />
                    주식 가치
                  </div>
                  <div className="font-bold text-purple-700">
                    {formatKRWBillions(breakdown.stockValue)}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center gap-1 text-gray-700 text-xs mb-1">
                    <Building2 className="h-3 w-3" />
                    롤오버
                  </div>
                  <div className="font-bold text-gray-700">
                    {formatKRWBillions(breakdown.retainedValue)}
                  </div>
                </div>
              </div>

              <div className="mt-3 p-3 bg-muted rounded-lg">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Gross</div>
                    <div className="font-medium">{formatKRWBillions(netBreakdown.founderGross)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">수수료</div>
                    <div className="font-medium text-red-600">-{formatKRWBillions(netBreakdown.founderFee)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">세금</div>
                    <div className="font-medium text-red-600">-{formatKRWBillions(netBreakdown.founderTax)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Net (기대)</div>
                    <div className="font-bold text-primary">{formatKRWBillions(netBreakdown.founderNetExpected)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ASSET_DEAL 특별 표시 */}
          {!scenario.isFounderCashoutCalculable && (
            <Alert className="border-cyan-500/50 bg-cyan-500/10">
              <Building2 className="h-4 w-4 text-cyan-600" />
              <AlertDescription>
                <strong>법인으로 현금 유입:</strong> {formatKRWBillions(breakdown.corporateCashIn || 0)}
                <br />
                <span className="text-sm text-muted-foreground">
                  창업자 수령은 배당/감자/청산 등 2차 절차가 필요하여 즉시 계산이 불가합니다.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* 장단점 */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 text-green-600">장점</h4>
              <ul className="text-sm space-y-1">
                {pros.map((p, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2 text-red-600">단점/리스크</h4>
              <ul className="text-sm space-y-1">
                {cons.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 설명 */}
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-sm">{explanation}</p>
          </div>

          {/* 점수 */}
          {score && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>점수: 즉시현금 {score.cashNow}</span>
              <span>업사이드 {score.upside}</span>
              <span>리스크(낮을수록 좋음) {5 - score.risk}</span>
              <span>적합도 {score.founderFit >= 0 ? `+${score.founderFit}` : score.founderFit}</span>
              <span className="font-medium">총점 {score.total}</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
