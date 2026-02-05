"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StepProgress } from "@/components/step3/StepProgress";
import { UploadPanel } from "@/components/step3/UploadPanel";
import { ExtractedForm } from "@/components/step3/ExtractedForm";
import { CTAForm } from "@/components/step3/CTAForm";
import { ContactForm } from "@/components/step3/ContactForm";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Document } from "@/lib/supabase/types";
import type { Step1Result } from "@/lib/valuation/types";
import type { Step2Result } from "@/lib/simulations/types";
import { formatKRWBillions } from "@/lib/valuation/formatter";

export default function Step3Page() {
  const supabase = getSupabaseBrowserClient();

  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [document, setDocument] = React.useState<Document | null>(null);
  const [step1Result, setStep1Result] = React.useState<Step1Result | null>(null);
  const [step2Result, setStep2Result] = React.useState<Step2Result | null>(null);

  // 데이터 로드 (인증 불필요)
  React.useEffect(() => {
    const init = async () => {
      // 세션 확인 (선택적 - 있으면 userId 설정)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        // 기존 문서 조회 (가장 최근)
        const { data: docs } = await supabase
          .from("documents")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (docs && docs.length > 0) {
          setDocument(docs[0]);
        }
      }

      // localStorage에서 Step1/Step2 결과 로드
      if (typeof window !== "undefined") {
        const step1Data = localStorage.getItem("sme_step1_result");
        const step2Data = localStorage.getItem("sme_step2_result");

        if (step1Data) {
          try {
            setStep1Result(JSON.parse(step1Data));
          } catch {}
        }
        if (step2Data) {
          try {
            setStep2Result(JSON.parse(step2Data));
          } catch {}
        }
      }

      setIsLoading(false);
    };

    init();
  }, [supabase]);

  // 문서 업데이트 핸들러
  const handleDocumentChange = (doc: Document | null) => {
    setDocument(doc);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/app/step2">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Step 2
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <span className="font-semibold">Step 3: 재무제표 분석</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 px-4 max-w-3xl mx-auto">
        <div className="space-y-6">
          {/* 진행 단계 */}
          <StepProgress currentStep={3} />

          {/* Step1/2 결과 요약 */}
          {(step1Result || step2Result) && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardDescription>이전 단계 결과 요약</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {step1Result && step1Result.canEvaluate && (
                    <div>
                      <p className="text-muted-foreground">예상 지분가치</p>
                      <p className="font-medium">
                        {formatKRWBillions(step1Result.equityValue.low)} ~{" "}
                        {formatKRWBillions(step1Result.equityValue.high)} 원
                      </p>
                    </div>
                  )}
                  {step2Result && step2Result.scenarios.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">현재가치 (PV)</p>
                      <p className="font-medium">
                        {formatKRWBillions(
                          step2Result.scenarios.find((s) => s.equityPct === 100)
                            ?.pv ||
                            step2Result.scenarios[step2Result.scenarios.length - 1]
                              ?.pv ||
                            0
                        )}{" "}
                        원
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* 섹션 A: 재무제표 업로드 */}
          {userId && (
            <UploadPanel
              userId={userId}
              document={document}
              onDocumentChange={handleDocumentChange}
            />
          )}

          {/* 섹션 B: 추출값 검증/수정 */}
          {document &&
            (document.status === "parsed" || document.status === "verified") && (
              <ExtractedForm
                document={document}
                onVerified={handleDocumentChange}
              />
            )}

          <Separator />

          {/* 섹션 C: 중개법인 연결 CTA */}
          <CTAForm document={document} />

          <Separator />

          {/* 섹션 D: 연락처 입력 - 전문가 상담 신청 */}
          <ContactForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container py-6 text-center text-sm text-muted-foreground space-y-2">
          <p>
            업로드된 재무제표는 암호화되어 안전하게 보관되며, 동의 없이 제3자에게
            제공되지 않습니다.
          </p>
          <p>
            본 서비스는 참고용 정보 제공을 목적으로 하며, 투자 또는 거래
            의사결정의 근거로 사용될 수 없습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
