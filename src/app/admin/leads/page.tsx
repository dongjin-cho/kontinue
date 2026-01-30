import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  page?: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "대기", variant: "secondary" },
  sent: { label: "전송 완료", variant: "default" },
  failed: { label: "전송 실패", variant: "destructive" },
};

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const supabase = createAdminClient();

  const { data: leads, count } = await supabase
    .from("leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const totalPages = Math.ceil((count || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">리드 관리</h1>
          <p className="text-muted-foreground">총 {count}건</p>
        </div>
        <a href="/api/admin/export?type=leads">
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
                  <th className="text-left p-3">이름</th>
                  <th className="text-left p-3">이메일</th>
                  <th className="text-left p-3">전화번호</th>
                  <th className="text-left p-3">상태</th>
                  <th className="text-left p-3">동의</th>
                  <th className="text-left p-3">제출일</th>
                </tr>
              </thead>
              <tbody>
                {leads?.map((lead) => {
                  const statusConfig = STATUS_CONFIG[lead.sent_status] || STATUS_CONFIG.pending;
                  
                  return (
                    <tr key={lead.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Link
                          href={`/admin/leads/${lead.id}`}
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {lead.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="p-3 font-medium">{lead.contact_name}</td>
                      <td className="p-3">{lead.contact_email}</td>
                      <td className="p-3">{lead.contact_phone || "-"}</td>
                      <td className="p-3">
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {lead.consent_given ? (
                          <Badge variant="default" className="bg-green-500">동의</Badge>
                        ) : (
                          <Badge variant="outline">-</Badge>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString("ko-KR")}
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
            <Link href={`/admin/leads?page=${page - 1}`}>
              <Button variant="outline" size="sm">이전</Button>
            </Link>
          )}
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/leads?page=${page + 1}`}>
              <Button variant="outline" size="sm">다음</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
