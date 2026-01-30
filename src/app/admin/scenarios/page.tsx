import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/date";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { Download, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
}

interface SimulationRun {
  id: string;
  user_id: string | null;
  anon_token: string | null;
  industry_group: string | null;
  deal_scenarios_input: Record<string, unknown> | null;
  deal_scenarios_result: {
    baseEquityMedian?: number;
    top3?: string[];
    scenarios?: Array<{
      code: string;
      name: string;
      eligible: boolean;
      netBreakdown?: { founderNetExpected?: number };
    }>;
  } | null;
  deal_scenarios_completed_at: string | null;
  created_at: string;
}

export default async function AdminScenariosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const supabase = createAdminClient();

  let runs: SimulationRun[] = [];
  let count = 0;

  try {
    const result = await supabase
      .from("simulation_runs")
      .select("id, user_id, anon_token, industry_group, deal_scenarios_input, deal_scenarios_result, deal_scenarios_completed_at, created_at", { count: "exact" })
      .not("deal_scenarios_completed_at", "is", null)
      .order("deal_scenarios_completed_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    runs = (result.data as SimulationRun[]) || [];
    count = result.count || 0;

    if (result.error) {
      console.error("Scenarios query error:", result.error);
    }
  } catch (e) {
    console.error("Scenarios query error:", e);
  }

  const totalPages = Math.ceil((count || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">딜 시나리오 분석</h1>
          <p className="text-muted-foreground">총 {count}건</p>
        </div>
        <a href="/api/admin/export?type=scenarios">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV 내보내기
          </Button>
        </a>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">산업군</th>
                  <th className="text-left p-3">사용자</th>
                  <th className="text-left p-3">Top 3</th>
                  <th className="text-right p-3">기준 Equity</th>
                  <th className="text-left p-3">생성일</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const dealResult = run.deal_scenarios_result;
                  const top3 = dealResult?.top3 || [];
                  const baseEquity = dealResult?.baseEquityMedian;

                  return (
                    <tr key={run.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Link
                          href={`/admin/scenarios/${run.id}`}
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {run.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="p-3">{run.industry_group || "-"}</td>
                      <td className="p-3">
                        {run.user_id ? (
                          <Badge variant="default">로그인</Badge>
                        ) : (
                          <Badge variant="secondary">게스트</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {top3.slice(0, 3).map((code, idx) => (
                            <Badge
                              key={code}
                              variant={idx === 0 ? "default" : "secondary"}
                              className={idx === 0 ? "bg-yellow-500" : ""}
                            >
                              {idx === 0 && <Trophy className="h-3 w-3 mr-1" />}
                              {code.slice(0, 10)}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {baseEquity ? formatKRWBillions(baseEquity) : "-"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDateTime(run.deal_scenarios_completed_at)}
                      </td>
                    </tr>
                  );
                })}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      딜 시나리오 분석 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/scenarios?page=${page - 1}`}>
              <Button variant="outline" size="sm">이전</Button>
            </Link>
          )}
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/scenarios?page=${page + 1}`}>
              <Button variant="outline" size="sm">다음</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
