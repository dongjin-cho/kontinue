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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  uploaded: { label: "업로드", color: "bg-blue-500" },
  parsing: { label: "분석중", color: "bg-yellow-500" },
  parsed: { label: "분석완료", color: "bg-green-500" },
  verified: { label: "검증완료", color: "bg-primary" },
  failed: { label: "실패", color: "bg-red-500" },
};

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const supabase = createAdminClient();

  const { data: docs, count } = await supabase
    .from("documents")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const totalPages = Math.ceil((count || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">문서 관리</h1>
          <p className="text-muted-foreground">총 {count}건</p>
        </div>
        <a href="/api/admin/export?type=documents">
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
                  <th className="text-left p-3">파일명</th>
                  <th className="text-left p-3">타입</th>
                  <th className="text-left p-3">상태</th>
                  <th className="text-left p-3">선택 기간</th>
                  <th className="text-left p-3">업로드일</th>
                </tr>
              </thead>
              <tbody>
                {docs?.map((doc) => {
                  const statusConfig = STATUS_CONFIG[doc.status] || STATUS_CONFIG.uploaded;
                  
                  return (
                    <tr key={doc.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <Link
                          href={`/admin/documents/${doc.id}`}
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          {doc.id.slice(0, 8)}...
                        </Link>
                      </td>
                      <td className="p-3 font-medium max-w-[200px] truncate">
                        {doc.file_name}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{doc.mime_type.split("/")[1]}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={statusConfig.color}>
                          {statusConfig.label}
                        </Badge>
                      </td>
                      <td className="p-3">{doc.selected_period_id || "-"}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("ko-KR")}
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
            <Link href={`/admin/documents?page=${page - 1}`}>
              <Button variant="outline" size="sm">이전</Button>
            </Link>
          )}
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link href={`/admin/documents?page=${page + 1}`}>
              <Button variant="outline" size="sm">다음</Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
