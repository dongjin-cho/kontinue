import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, Users, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const supabase = createAdminClient();

  // 총 런 수
  const { count: totalRuns } = await supabase
    .from("simulation_runs")
    .select("*", { count: "exact", head: true });

  // 최근 7일 런 수
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { count: recentRuns } = await supabase
    .from("simulation_runs")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo.toISOString());

  // Step별 완료 수
  const { count: step1Completed } = await supabase
    .from("simulation_runs")
    .select("*", { count: "exact", head: true })
    .not("step1_completed_at", "is", null);

  const { count: step2Completed } = await supabase
    .from("simulation_runs")
    .select("*", { count: "exact", head: true })
    .not("step2_completed_at", "is", null);

  // 문서 통계
  const { count: totalDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true });

  const { count: verifiedDocs } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("status", "verified");

  // 리드 통계
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  const { count: sentLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("sent_status", "sent");

  return {
    totalRuns: totalRuns || 0,
    recentRuns: recentRuns || 0,
    step1Completed: step1Completed || 0,
    step2Completed: step2Completed || 0,
    totalDocs: totalDocs || 0,
    verifiedDocs: verifiedDocs || 0,
    totalLeads: totalLeads || 0,
    sentLeads: sentLeads || 0,
    leadSuccessRate: totalLeads ? Math.round(((sentLeads || 0) / totalLeads) * 100) : 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">서비스 현황 및 통계</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">총 시뮬레이션</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRuns}</div>
            <p className="text-xs text-muted-foreground">
              최근 7일: {stats.recentRuns}건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Step 완료율</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRuns > 0
                ? Math.round((stats.step2Completed / stats.totalRuns) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Step1: {stats.step1Completed} / Step2: {stats.step2Completed}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">문서 업로드</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocs}</div>
            <p className="text-xs text-muted-foreground">
              검증 완료: {stats.verifiedDocs}건
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">리드</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              전송 성공률: {stats.leadSuccessRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:border-primary/50 transition-colors">
          <a href="/admin/runs" className="block p-6">
            <h3 className="font-semibold mb-2">시뮬레이션 목록 →</h3>
            <p className="text-sm text-muted-foreground">
              모든 시뮬레이션 런 조회 및 상세 분석
            </p>
          </a>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <a href="/admin/documents" className="block p-6">
            <h3 className="font-semibold mb-2">문서 관리 →</h3>
            <p className="text-sm text-muted-foreground">
              업로드된 재무제표 및 파싱 결과 확인
            </p>
          </a>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <a href="/admin/leads" className="block p-6">
            <h3 className="font-semibold mb-2">리드 관리 →</h3>
            <p className="text-sm text-muted-foreground">
              중개법인 연결 요청 및 전송 상태 확인
            </p>
          </a>
        </Card>
      </div>
    </div>
  );
}
