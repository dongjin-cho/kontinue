import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminRunDetailPage({
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

  const step1Result = run.step1_result as Record<string, unknown> | null;
  const step2Result = run.step2_result as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/runs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">시뮬레이션 상세</h1>
          <p className="text-muted-foreground font-mono">{run.id}</p>
        </div>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">사용자</p>
              <p className="font-medium">
                {run.user_id ? (
                  <Badge variant="default">로그인</Badge>
                ) : (
                  <Badge variant="secondary">게스트</Badge>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">산업군</p>
              <p className="font-medium">{run.industry_group || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">회사명</p>
              <p className="font-medium">{run.company_name || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">생성일</p>
              <p className="font-medium">
                {new Date(run.created_at).toLocaleString("ko-KR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 완료 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>Step 진행 상태</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm">Step 1:</span>
              {run.step1_completed_at ? (
                <Badge variant="default" className="bg-green-500">
                  {new Date(run.step1_completed_at).toLocaleString("ko-KR")}
                </Badge>
              ) : (
                <Badge variant="outline">미완료</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Step 2:</span>
              {run.step2_completed_at ? (
                <Badge variant="default" className="bg-green-500">
                  {new Date(run.step2_completed_at).toLocaleString("ko-KR")}
                </Badge>
              ) : (
                <Badge variant="outline">미완료</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Step 3:</span>
              {run.step3_completed_at ? (
                <Badge variant="default" className="bg-green-500">
                  {new Date(run.step3_completed_at).toLocaleString("ko-KR")}
                </Badge>
              ) : (
                <Badge variant="outline">미완료</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step1 결과 */}
      {step1Result && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Equity Value</p>
                <p className="font-medium">
                  {step1Result.equityValue ? (
                    <>
                      {formatKRWBillions((step1Result.equityValue as { low: number }).low)} ~{" "}
                      {formatKRWBillions((step1Result.equityValue as { high: number }).high)}
                    </>
                  ) : (
                    "-"
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">멀티플</p>
                <p className="font-medium">
                  {(step1Result.multiples as { finalMedian?: number })?.finalMedian?.toFixed(1) || "-"}x
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">순차입금</p>
                <p className="font-medium">
                  {step1Result.netDebt ? formatKRWBillions(step1Result.netDebt as number) : "-"}
                </p>
              </div>
            </div>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                전체 JSON 보기
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto max-h-96 text-xs">
                {JSON.stringify(step1Result, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Step2 결과 */}
      {step2Result && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                전체 JSON 보기
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg overflow-auto max-h-96 text-xs">
                {JSON.stringify(step2Result, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
