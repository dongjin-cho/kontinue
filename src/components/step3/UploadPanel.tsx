"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Document, DocumentStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface UploadPanelProps {
  userId: string;
  document: Document | null;
  onDocumentChange: (doc: Document | null) => void;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  uploaded: {
    label: "업로드 완료",
    color: "bg-blue-500",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  parsing: {
    label: "분석 중",
    color: "bg-yellow-500",
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  parsed: {
    label: "분석 완료",
    color: "bg-green-500",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  verified: {
    label: "검증 완료",
    color: "bg-primary",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  failed: {
    label: "분석 실패",
    color: "bg-red-500",
    icon: <XCircle className="h-4 w-4" />,
  },
};

export function UploadPanel({
  userId,
  document,
  onDocumentChange,
}: UploadPanelProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isParsing, setIsParsing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const supabase = getSupabaseBrowserClient();

  // 문서 상태 폴링 (parsing 중일 때)
  React.useEffect(() => {
    if (!document || document.status !== "parsing") return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("id", document.id)
        .single();

      if (data && data.status !== "parsing") {
        onDocumentChange(data);
      }
    }, 3000); // 3초마다 체크

    return () => clearInterval(interval);
  }, [document, supabase, onDocumentChange]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 체크
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("PDF, 이미지(PNG, JPG), 또는 Excel 파일만 업로드 가능합니다.");
      return;
    }

    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("파일 크기는 10MB 이하여야 합니다.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // 파일 경로 생성
      const fileExt = file.name.split(".").pop();
      const documentId = crypto.randomUUID();
      const filePath = `${userId}/${documentId}/${file.name}`;

      // Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // documents 테이블에 레코드 생성
      const { data: newDoc, error: dbError } = await supabase
        .from("documents")
        .insert({
          id: documentId,
          user_id: userId,
          file_path: filePath,
          file_name: file.name,
          mime_type: file.type,
          status: "uploaded",
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(dbError.message);
      }

      onDocumentChange(newDoc);
    } catch (err) {
      console.error("Upload error:", err);
      setError(
        err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다."
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleStartParsing = async () => {
    if (!document) return;

    setIsParsing(true);
    setError(null);

    try {
      const response = await fetch("/api/document/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "파싱 요청 실패");
      }

      // 상태 업데이트
      onDocumentChange({ ...document, status: "parsing" });
    } catch (err) {
      console.error("Parse error:", err);
      setError(
        err instanceof Error ? err.message : "분석 요청 중 오류가 발생했습니다."
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleRetry = async () => {
    if (!document) return;

    // 상태를 uploaded로 리셋
    await supabase
      .from("documents")
      .update({ status: "uploaded", error_message: null })
      .eq("id", document.id);

    onDocumentChange({ ...document, status: "uploaded", error_message: null });
  };

  const statusConfig = document ? STATUS_CONFIG[document.status] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          재무제표 업로드
        </CardTitle>
        <CardDescription>
          최근 회계연도의 재무제표를 업로드해주세요. (PDF, 이미지, Excel)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 파일 업로드 영역 */}
        {!document && (
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              "hover:border-primary hover:bg-primary/5 cursor-pointer",
              isUploading && "opacity-50 pointer-events-none"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">업로드 중...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">파일을 선택하거나 드래그하세요</p>
                <p className="text-sm text-muted-foreground">
                  PDF, PNG, JPG, Excel (최대 10MB)
                </p>
              </div>
            )}
          </div>
        )}

        {/* 업로드된 문서 정보 */}
        {document && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <FileText className="h-8 w-8 text-muted-foreground mt-1" />
                <div>
                  <p className="font-medium">{document.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(document.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
              </div>
              {statusConfig && (
                <Badge
                  className={cn("flex items-center gap-1", statusConfig.color)}
                >
                  {statusConfig.icon}
                  {statusConfig.label}
                </Badge>
              )}
            </div>

            {/* 상태별 액션 */}
            {document.status === "uploaded" && (
              <Button
                onClick={handleStartParsing}
                disabled={isParsing}
                className="w-full"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    분석 요청 중...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    재무 데이터 분석 시작
                  </>
                )}
              </Button>
            )}

            {document.status === "parsing" && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  재무제표를 분석하고 있습니다. 잠시만 기다려주세요...
                </AlertDescription>
              </Alert>
            )}

            {document.status === "failed" && (
              <div className="space-y-2">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {document.error_message || "분석 중 오류가 발생했습니다."}
                  </AlertDescription>
                </Alert>
                <Button variant="outline" onClick={handleRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  다시 시도
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 안내 문구 */}
        <p className="text-xs text-muted-foreground">
          * 업로드된 파일은 암호화되어 안전하게 저장되며, 기업가치 평가 목적으로만
          사용됩니다.
        </p>
      </CardContent>
    </Card>
  );
}
