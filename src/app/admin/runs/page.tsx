import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKRWBillions } from "@/lib/valuation/formatter";
import { formatDateTime } from "@/lib/utils/date";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
}

export default async function AdminRunsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const supabase = createAdminClient();

  interface SimulationRun {
    id: string;
    user_id: string | null;
    anon_token: string | null;
    industry_group: string | null;
    step1_completed_at: string | null;
    step2_completed_at: string | null;
    step1_result: Record<string, unknown> | null;
    created_at: string;
  }

  let runs: SimulationRun[] = [];
  let count = 0;

  try {
    const result = await supabase
      .from("simulation_runs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    runs = (result.data as SimulationRun[]) || [];
    count = result.count || 0;
    
    if (result.error) {
      console.error("Runs query error:", result.error);
    }
  } catch (e) {
    console.error("Runs query error:", e);
  }

  const totalPages = Math.ceil((count || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">시뮬레이션 런</h1>
          <p className="text-muted-foreground">총 {count}건</p>
        </div>
        <a href="/api/admin/export?type=runs">
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
                  <th className="text-left p-3">Step1</th>
                  <th className="text-left p-3">Step2</th>
                  <th className="text-right p-3">Equity Value</th>
                  <th className="text-left p-3">생성일</th>
                </tr>
              </thead>
              <tbody>
                {runs?.map((run) => {
                  const step1Result = run.step1_result as Record<string, unknown> | null;
                  const equityValue = step1Result?.equityValue as { low?: number; high?: number } | null;
                  
                  return (
                    <tr key={run.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Link
                          href={`/admin/runs/${run.id}`}
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
                        {run.step1_completed_at ? (
                          <Badge variant="default" className="bg-green-500">완료</Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {run.step2_completed_at ? (
                          <Badge variant="default" className="bg-green-500">완료</Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {equityValue?.low && equityValue?.high ? (
                          <>
                            {formatKRWBillions(equityValue.low)} ~ {formatKRWBillions(equityValue.high)}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDateTime(run.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Link href={`/admin/runs?page=${page - 1}`}>
              <Button variant="outline" size="sm">이전</Button>
            </Link>
          )}
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/runs?page=${page + 1}`}>
              <Button variant="outline" size="sm">다음</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
