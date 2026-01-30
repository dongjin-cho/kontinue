"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";

const CATEGORIES = [
  { value: "ebitda", label: "EBITDA" },
  { value: "multiple", label: "멀티플" },
  { value: "valuation", label: "기업가치 평가" },
  { value: "deal_structure", label: "딜 구조" },
  { value: "tax", label: "세금" },
  { value: "process", label: "M&A 프로세스" },
  { value: "general", label: "일반" },
];

export default function NewKnowledgePage() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [category, setCategory] = React.useState("general");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 모두 입력해 주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      });

      const data = await response.json();

      if (data.success) {
        router.push("/admin/knowledge");
      } else {
        setError(data.error || "문서 추가에 실패했습니다.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("서버 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Link href="/admin/knowledge">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">새 문서 추가</h1>
          <p className="text-slate-500">RAG 챗봇에서 참조할 문서를 추가합니다</p>
        </div>
      </div>

      {/* 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>문서 정보</CardTitle>
          <CardDescription>
            문서 제목과 내용은 임베딩되어 유사도 검색에 사용됩니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  placeholder="예: EBITDA 정의와 계산 방법"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">카테고리</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">내용 *</Label>
                <Textarea
                  id="content"
                  placeholder="문서 내용을 입력하세요. 상세할수록 챗봇의 답변 품질이 향상됩니다."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  {content.length}자 입력됨 (권장: 500~2000자)
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-slate-800 hover:bg-slate-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    저장
                  </>
                )}
              </Button>
              <Link href="/admin/knowledge">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
