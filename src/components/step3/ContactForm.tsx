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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  UserCircle,
  MessageSquare,
  Upload,
  FileText,
  X,
  Handshake,
  AlertTriangle,
} from "lucide-react";

interface ContactFormProps {
  onSubmit?: (data: ContactData) => void;
}

interface ContactData {
  name: string;
  email: string;
  phone: string;
  message?: string;
  files?: File[];
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const [formData, setFormData] = React.useState<ContactData>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [files, setFiles] = React.useState<File[]>([]);
  const [consent, setConsent] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      setFiles((prev) => [...prev, ...Array.from(selectedFiles)]);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email && !formData.phone) {
      setError("이메일 또는 전화번호 중 하나는 필수입니다.");
      return;
    }

    if (!consent) {
      setError("정보 전달에 동의해 주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 서버에 연락처 정보 저장
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          hasFiles: files.length > 0,
          fileNames: files.map((f) => f.name),
          // localStorage에서 분석 결과 요약 가져오기
          step1Result: localStorage.getItem("sme_step1_result"),
          step2Result: localStorage.getItem("sme_step2_result_v2"),
          dealResult: localStorage.getItem("sme_deal_scenarios_result_v1"),
          preferredScenario: localStorage.getItem("sme_preferred_scenario"),
        }),
      });

      if (!response.ok) {
        throw new Error("제출 중 오류가 발생했습니다.");
      }

      setIsSubmitted(true);
      onSubmit?.(formData);
    } catch (err) {
      console.error("Contact form error:", err);
      setError(err instanceof Error ? err.message : "제출 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-emerald-800 mb-2">
              문의가 접수되었습니다
            </h3>
            <p className="text-sm text-emerald-700">
              입력하신 연락처로 전문 컨설턴트가 연락드리겠습니다.
              <br />
              영업일 기준 1-2일 내에 연락드릴 예정입니다.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
          <Handshake className="h-5 w-5 text-slate-600" />
          전문가 상담 및 중개법인 연결
        </CardTitle>
        <CardDescription className="text-slate-500">
          더 정확한 기업가치 분석과 M&A 자문이 필요하시면 연락처와 재무제표를 첨부해 주세요.
          <br />
          전문 컨설턴트가 맞춤형 상담을 제공해 드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 면책 문구 */}
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            본 결과는 참고용 시뮬레이션이며 실제 거래가는 실사/협상/시장상황에 따라 달라질 수 있습니다.
            중개법인 연결 시 별도의 수수료가 발생할 수 있습니다.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 연락처 정보 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-700 flex items-center gap-2">
                <UserCircle className="h-4 w-4 text-slate-400" />
                성함 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="홍길동"
                className="border-slate-200"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                이메일 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@company.com"
                className="border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-700 flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" />
                전화번호
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="010-1234-5678"
                className="border-slate-200"
              />
            </div>
          </div>

          <Separator />

          {/* 파일 업로드 */}
          <div className="space-y-4">
            <Label className="text-slate-700 flex items-center gap-2">
              <Upload className="h-4 w-4 text-slate-400" />
              재무제표 첨부 (선택)
            </Label>
            <p className="text-xs text-slate-500">
              재무제표를 첨부하시면 더 정확한 분석이 가능합니다. (PDF, Excel 지원)
            </p>
            
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-slate-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">클릭하여 파일 선택</p>
              <p className="text-xs text-slate-400 mt-1">PDF, XLSX, XLS (최대 10MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.xlsx,.xls"
                multiple
                onChange={handleFileChange}
              />
            </div>

            {/* 첨부된 파일 목록 */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700 truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-slate-200 rounded"
                    >
                      <X className="h-4 w-4 text-slate-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* 문의 내용 (선택) */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-slate-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-slate-400" />
              문의 내용 (선택)
            </Label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="궁금하신 점이나 상담받고 싶은 내용을 적어주세요."
              className="w-full h-24 px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <Separator />

          {/* 동의 체크박스 */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300"
            />
            <Label
              htmlFor="consent"
              className="text-sm cursor-pointer text-slate-600"
            >
              <span className="text-red-500">*</span>{" "}
              입력하신 정보와 시뮬레이션 결과를 전문 중개법인에 전달하는 것에 동의합니다.
            </Label>
          </div>

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700"
            size="lg"
            disabled={isLoading || !consent}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <Handshake className="mr-2 h-4 w-4" />
                상담 및 연결 요청
              </>
            )}
          </Button>

          <p className="text-xs text-slate-400 text-center">
            입력하신 정보는 상담 목적으로만 사용되며, 동의 없이 제3자에게 제공되지 않습니다.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
