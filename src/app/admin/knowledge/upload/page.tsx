"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Upload, FileText, CheckCircle, AlertTriangle } from "lucide-react";

const CATEGORIES = [
  { value: "ebitda", label: "EBITDA" },
  { value: "multiple", label: "멀티플" },
  { value: "valuation", label: "기업가치 평가" },
  { value: "deal_structure", label: "딜 구조" },
  { value: "tax", label: "세금" },
  { value: "process", label: "M&A 프로세스" },
  { value: "general", label: "일반" },
];

interface UploadResult {
  filename: string;
  success: boolean;
  documentId?: string;
  error?: string;
}

export default function UploadKnowledgePage() {
  const router = useRouter();
  const [files, setFiles] = React.useState<File[]>([]);
  const [category, setCategory] = React.useState("general");
  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<UploadResult[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("업로드할 파일을 선택해 주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    const uploadResults: UploadResult[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);

        const response = await fetch("/api/admin/knowledge/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        uploadResults.push({
          filename: file.name,
          success: data.success,
          documentId: data.documentId,
          error: data.error,
        });
      } catch (err) {
        console.error("Upload error:", err);
        uploadResults.push({
          filename: file.name,
          success: false,
          error: "업로드 실패",
        });
      }
    }

    setResults(uploadResults);
    setIsLoading(false);

    // 모두 성공하면 목록으로 이동
    const allSuccess = uploadResults.every((r) => r.success);
    if (allSuccess) {
      setTimeout(() => {
        router.push("/admin/knowledge");
      }, 2000);
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
          <h1 className="text-2xl font-bold text-slate-800">파일 업로드</h1>
          <p className="text-slate-500">텍스트 파일을 업로드하여 지식 베이스에 추가합니다</p>
        </div>
      </div>

      {/* 업로드 폼 */}
      <Card>
        <CardHeader>
          <CardTitle>파일 선택</CardTitle>
          <CardDescription>
            지원 형식: .txt, .md (최대 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 드래그 앤 드롭 영역 */}
          <div
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 mb-2">
              파일을 드래그하거나 클릭하여 선택
            </p>
            <p className="text-sm text-slate-400">
              .txt, .md 파일 지원
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 선택된 파일 목록 */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>선택된 파일 ({files.length}개)</Label>
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-slate-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 카테고리 선택 */}
          <div className="space-y-2">
            <Label>카테고리 (모든 파일에 적용)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-64">
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

          {/* 에러 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 결과 */}
          {results.length > 0 && (
            <div className="space-y-2">
              <Label>업로드 결과</Label>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      result.success ? "bg-green-50" : "bg-red-50"
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">{result.filename}</span>
                    {result.success ? (
                      <span className="text-xs text-green-600">성공</span>
                    ) : (
                      <span className="text-xs text-red-600">{result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={isLoading || files.length === 0}
              className="bg-slate-800 hover:bg-slate-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  업로드 ({files.length}개)
                </>
              )}
            </Button>
            <Link href="/admin/knowledge">
              <Button type="button" variant="outline">
                취소
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">파일 작성 가이드</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>• 파일명이 문서 제목으로 사용됩니다 (확장자 제외)</p>
          <p>• 내용은 500~2000자 권장 (너무 길면 자동 분할)</p>
          <p>• 마크다운 형식 지원 (.md)</p>
          <p>• 구조화된 내용이 검색 품질을 높입니다</p>
        </CardContent>
      </Card>
    </div>
  );
}
