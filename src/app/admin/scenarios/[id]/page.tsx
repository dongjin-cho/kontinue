import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/date";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { ArrowLeft, Trophy, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface ScenarioResult {
  code: string;
  name: string;
  eligible: boolean;
  eligibilityReasons: string[];
  assumptions: Record<string, number>;
  breakdown: {
    immediateCash: number;
    deferredCash: number;
    conditionalCashExpected: number;
    stockValue: number;
    retainedValue: number;
    corporateCashIn?: number;
  };
  netBreakdown: {
    founderGross: number;
    founderFee: number;
    founderTax: number;
    founderNet: number;
    founderNetExpected: number;
  };
  pros: string[];
  cons: string[];
  explanation: string;
  isFounderCashoutCalculable: boolean;
}

interface DealScenariosResult {
  baseEquityMedian: number;
  inputsEcho: {
    capTable: { founderShare: number; investorShare: number; optionPool: number };
    hopeToSell: string;
    revenueGrowth: number;
    ebitdaTrend: string;
    companyProfile: string;
    feeRate?: number;
    taxRate?: number;
  };
  scenarios: ScenarioResult[];
  top3: string[];
  scoring: Record<string, { cashNow: number; upside: number; risk: number; founderFit: number; total: number }>;
  warnings: string[];
}

export default async function AdminScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: run, error } = await supabase
    .from("simulation_runs")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !run) {
    notFound();
  }

  const dealResult = run.deal_scenarios_result as DealScenariosResult | null;
  const dealInput = run.deal_scenarios_input as Record<string, unknown> | null;

  if (!dealResult) {
    return (
      <div className="space-y-6">
        <Link href="/admin/scenarios">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">딜 시나리오 결과가 없습니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { baseEquityMedian, inputsEcho, scenarios, top3, scoring, warnings } = dealResult;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/scenarios">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>
        <div className="text-sm text-muted-foreground">
          생성: {formatDateTime(run.deal_scenarios_completed_at)}
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>시나리오 분석 상세</CardTitle>
          <CardDescription>Run ID: {run.id}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">기준 Equity</div>
              <div className="font-bold">{formatKRWBillions(baseEquityMedian)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">매각 희망</div>
              <div className="font-bold">{inputsEcho.hopeToSell}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">매출 성장률</div>
              <div className="font-bold">{inputsEcho.revenueGrowth}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">EBITDA 추이</div>
              <div className="font-bold">{inputsEcho.ebitdaTrend}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground">창업자 지분</div>
              <div className="font-medium">{inputsEcho.capTable.founderShare}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">투자자 지분</div>
              <div className="font-medium">{inputsEcho.capTable.investorShare}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">옵션풀</div>
              <div className="font-medium">{inputsEcho.capTable.optionPool}%</div>
            </div>
          </div>

          {inputsEcho.companyProfile && (
            <div>
              <div className="text-sm text-muted-foreground mb-1">기업 소개</div>
              <div className="text-sm p-2 bg-muted rounded">{inputsEcho.companyProfile}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top 3 */}
      <Card className="border-yellow-500/30 bg-yellow-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            추천 Top 3
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
                  className={`p-4 rounded-lg border-2 ${
                    idx === 0 ? "border-yellow-500 bg-yellow-100" : "border-muted bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={idx === 0 ? "default" : "secondary"}>
                      {idx + 1}위
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      점수: {scoring[code]?.total || 0}
                    </span>
                  </div>
                  <div className="font-semibold">{scenario.name}</div>
                  <div className="text-lg font-bold text-primary mt-1">
                    {scenario.isFounderCashoutCalculable
                      ? formatKRWBillions(scenario.netBreakdown.founderNetExpected)
                      : "N/A"}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 전체 시나리오 */}
      <Card>
        <CardHeader>
          <CardTitle>전체 시나리오 결과</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3">시나리오</th>
                  <th className="text-left p-3">적합성</th>
                  <th className="text-right p-3">즉시 현금</th>
                  <th className="text-right p-3">조건부(기대)</th>
                  <th className="text-right p-3">순수익(기대)</th>
                  <th className="text-right p-3">점수</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.code} className="border-b">
                    <td className="p-3">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.code}</div>
                    </td>
                    <td className="p-3">
                      {s.eligible ? (
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
                    </td>
                    <td className="p-3 text-right font-mono">
                      {s.isFounderCashoutCalculable
                        ? formatKRWBillions(s.breakdown.immediateCash)
                        : "-"}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {s.isFounderCashoutCalculable
                        ? formatKRWBillions(s.breakdown.conditionalCashExpected)
                        : "-"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {s.isFounderCashoutCalculable
                        ? formatKRWBillions(s.netBreakdown.founderNetExpected)
                        : "N/A"}
                    </td>
                    <td className="p-3 text-right">
                      {scoring[s.code]?.total || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 원시 JSON */}
      <Card>
        <CardHeader>
          <CardTitle>원시 데이터</CardTitle>
        </CardHeader>
        <CardContent>
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground mb-2">
              입력 JSON 보기
            </summary>
            <pre className="bg-muted p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(dealInput, null, 2)}
            </pre>
          </details>
          <details className="text-xs mt-4">
            <summary className="cursor-pointer text-muted-foreground mb-2">
              결과 JSON 보기
            </summary>
            <pre className="bg-muted p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(dealResult, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
