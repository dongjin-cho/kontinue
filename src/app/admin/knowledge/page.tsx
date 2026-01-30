import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Trash2, 
  BookOpen,
  Database,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils/date";
import { DeleteDocumentButton } from "@/components/admin/DeleteDocumentButton";

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

export default async function AdminKnowledgePage() {
  const supabase = createServiceClient();

  // 문서 목록 조회
  let documents: KnowledgeDocument[] = [];
  let stats = { total: 0, categories: {} as Record<string, number> };

  try {
    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("id, title, content, category, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      documents = data as KnowledgeDocument[];
      stats.total = documents.length;
      
      // 카테고리별 집계
      documents.forEach((doc) => {
        stats.categories[doc.category] = (stats.categories[doc.category] || 0) + 1;
      });
    }
  } catch (e) {
    console.error("Failed to fetch documents:", e);
  }

  const categoryColors: Record<string, string> = {
    ebitda: "bg-blue-100 text-blue-700",
    multiple: "bg-green-100 text-green-700",
    valuation: "bg-purple-100 text-purple-700",
    deal_structure: "bg-orange-100 text-orange-700",
    tax: "bg-red-100 text-red-700",
    process: "bg-slate-100 text-slate-700",
    general: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">지식 베이스</h1>
          <p className="text-slate-500">RAG 챗봇용 문서를 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/knowledge/upload">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              파일 업로드
            </Button>
          </Link>
          <Link href="/admin/knowledge/new">
            <Button className="gap-2 bg-slate-800 hover:bg-slate-700">
              <Plus className="h-4 w-4" />
              문서 추가
            </Button>
          </Link>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-slate-500">전체 문서</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {Object.entries(stats.categories).slice(0, 3).map(([category, count]) => (
          <Card key={category}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-slate-500" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-sm text-slate-500 capitalize">{category}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 문서 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>문서 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">아직 등록된 문서가 없습니다</p>
              <p className="text-sm text-slate-400 mb-4">
                시드 API를 실행하거나 문서를 직접 추가하세요
              </p>
              <Link href="/admin/knowledge/new">
                <Button>첫 문서 추가하기</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        href={`/admin/knowledge/${doc.id}`}
                        className="font-medium text-slate-800 hover:text-slate-600"
                      >
                        {doc.title}
                      </Link>
                      <Badge className={categoryColors[doc.category] || categoryColors.general}>
                        {doc.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2">
                      {doc.content.substring(0, 150)}...
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDateTime(doc.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Link href={`/admin/knowledge/${doc.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        수정
                      </Button>
                    </Link>
                    <DeleteDocumentButton documentId={doc.id} title={doc.title} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
