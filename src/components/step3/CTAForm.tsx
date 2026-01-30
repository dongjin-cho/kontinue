"use client";

import * as React from "react";
import Link from "next/link";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Handshake,
  Mail,
  Phone,
  User,
  MessageSquare,
  PartyPopper,
} from "lucide-react";
import type { Document } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

interface CTAFormProps {
  document: Document | null;
}

interface ContactForm {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export function CTAForm({ document }: CTAFormProps) {
  const [consent, setConsent] = React.useState(false);
  const [contact, setContact] = React.useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [leadId, setLeadId] = React.useState<string | null>(null);

  const isFormValid = consent && contact.name && contact.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // localStorage에서 Step1/Step2 결과 가져오기
      let step1 = null;
      let step2 = null;

      if (typeof window !== "undefined") {
        const step1Data = localStorage.getItem("sme_step1_result");
        const step2Data = localStorage.getItem("sme_step2_result");

        if (step1Data) {
          try {
            step1 = JSON.parse(step1Data);
          } catch {}
        }
        if (step2Data) {
          try {
            step2 = JSON.parse(step2Data);
          } catch {}
        }
      }

      const response = await fetch("/api/lead/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document?.id,
          consent: true,
          contact: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone || undefined,
            message: contact.message || undefined,
          },
          step1,
          step2,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "제출 실패");
      }

      setLeadId(data.leadId);
      setIsSuccess(true);
    } catch (err) {
      console.error("Submit error:", err);
      setError(
        err instanceof Error ? err.message : "제출 중 오류가 발생했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 성공 화면
  if (isSuccess) {
    return (
      <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
        <CardContent className="pt-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">요청이 완료되었습니다!</h3>
            <p className="text-muted-foreground">
              중개법인에서 곧 연락드릴 예정입니다.
            </p>
          </div>

          <Alert className="text-left">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>다음 단계</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• 입력하신 이메일로 확인 메일이 발송됩니다.</li>
                <li>• 전문 중개법인 담당자가 2-3 영업일 내 연락드립니다.</li>
                <li>• 추가 상담이 필요하시면 언제든 문의해주세요.</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-3 pt-4">
            <Link href="/app/step1">
              <Button variant="outline" className="w-full">
                새로운 평가 시작하기
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                홈으로 돌아가기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5" />
          중개법인 연결
        </CardTitle>
        <CardDescription>
          전문 M&A 중개법인과 상담을 요청하실 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 면책 문구 */}
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            본 결과는 참고용 시뮬레이션이며 실제 거래가는 실사/협상/시장상황에
            따라 달라질 수 있습니다. 중개법인 연결 시 별도의 수수료가 발생할 수
            있습니다.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 연락처 정보 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                이름 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={contact.name}
                onChange={(e) =>
                  setContact((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="홍길동"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                이메일 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={contact.email}
                onChange={(e) =>
                  setContact((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="example@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                전화번호
              </Label>
              <Input
                id="phone"
                type="tel"
                value={contact.phone}
                onChange={(e) =>
                  setContact((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="010-1234-5678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                메시지 (선택)
              </Label>
              <textarea
                id="message"
                value={contact.message}
                onChange={(e) =>
                  setContact((prev) => ({ ...prev, message: e.target.value }))
                }
                placeholder="추가로 전달하고 싶은 내용이 있으시면 입력해주세요."
                className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <Separator />

          {/* 동의 체크박스 */}
          <div className="space-y-4">
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
                className={cn(
                  "text-sm cursor-pointer",
                  !consent && "text-muted-foreground"
                )}
              >
                <span className="text-destructive">*</span>{" "}
                재무정보 및 시뮬레이션 결과를 중개법인에 전달하는 것에
                동의합니다. 전달되는 정보에는 입력하신 재무제표 데이터, 기업가치
                평가 결과, 현금흐름 시뮬레이션 결과가 포함됩니다.
              </Label>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 제출 버튼 */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <Handshake className="mr-2 h-4 w-4" />
                중개법인에 연결 요청 보내기
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
