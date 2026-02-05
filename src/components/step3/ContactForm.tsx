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
import {
  Phone,
  Mail,
  CheckCircle2,
  Loader2,
  UserCircle,
  MessageSquare,
} from "lucide-react";

interface ContactFormProps {
  onSubmit?: (data: ContactData) => void;
}

interface ContactData {
  name: string;
  email: string;
  phone: string;
  message?: string;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const [formData, setFormData] = React.useState<ContactData>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email && !formData.phone) {
      setError("이메일 또는 전화번호 중 하나는 필수입니다.");
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
          // localStorage에서 분석 결과 요약 가져오기
          step1Result: localStorage.getItem("sme_step1_result"),
          step2Result: localStorage.getItem("sme_step2_result_v2"),
          dealResult: localStorage.getItem("sme_deal_scenarios_result_v1"),
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
          <MessageSquare className="h-5 w-5 text-slate-600" />
          전문가 상담 신청
        </CardTitle>
        <CardDescription className="text-slate-500">
          더 정확한 기업가치 분석과 M&A 자문이 필요하시면 연락처를 남겨주세요.
          <br />
          전문 컨설턴트가 맞춤형 상담을 제공해 드립니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-700 flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-slate-400" />
              성함
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="홍길동"
              className="border-slate-200"
            />
          </div>

          {/* 이메일 */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              이메일
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

          {/* 전화번호 */}
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

          {/* 문의 내용 (선택) */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-slate-700">
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

          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full bg-slate-800 hover:bg-slate-700"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                제출 중...
              </>
            ) : (
              "상담 신청하기"
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
