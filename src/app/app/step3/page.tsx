"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Trophy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StepProgress } from "@/components/step3/StepProgress";
import { ContactForm } from "@/components/step3/ContactForm";
import type { Step1Result } from "@/lib/valuation/types";
import type { Step2Result } from "@/lib/simulations/types";
import type { ScenarioResult } from "@/lib/deal/scenarios";
import { formatKRWBillions } from "@/lib/valuation/formatter";

export default function Step3Page() {

  const [isLoading, setIsLoading] = React.useState(true);
  const [step1Result, setStep1Result] = React.useState<Step1Result | null>(null);
  const [step2Result, setStep2Result] = React.useState<Step2Result | null>(null);
  const [preferredScenario, setPreferredScenario] = React.useState<ScenarioResult | null>(null);

  // 데이터 로드 (인증 불필요)
  React.useEffect(() => {
    // localStorage에서 Step1/Step2 결과 및 선호 시나리오 로드
    if (typeof window !== "undefined") {
      const step1Data = localStorage.getItem("sme_step1_result");
      const step2Data = localStorage.getItem("sme_step2_result");
      const preferredData = localStorage.getItem("sme_preferred_scenario");

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
      if (preferredData) {
        try {
          setPreferredScenario(JSON.parse(preferredData));
        } catch {}
      }
    }

    setIsLoading(false);
  }, []);

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
          {(step1Result || step2Result || preferredScenario) && (
            <Card className="border-slate-200 bg-slate-50">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-500">이전 단계 결과 요약</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {step1Result && step1Result.canEvaluate && (
                    <div>
                      <p className="text-slate-500">예상 지분가치</p>
                      <p className="font-semibold text-slate-800">
                        {formatKRWBillions(step1Result.equityValue.low)} ~{" "}
                        {formatKRWBillions(step1Result.equityValue.high)} 원
                      </p>
                    </div>
                  )}
                  {step2Result && step2Result.scenarios.length > 0 && (
                    <div>
                      <p className="text-slate-500">현재가치 (PV)</p>
                      <p className="font-semibold text-slate-800">
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

                {/* 선호 시나리오 표시 */}
                {preferredScenario && (
                  <>
                    <Separator className="bg-slate-200" />
                    <div className="p-4 bg-white rounded-lg border border-emerald-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium text-slate-700">선호 딜 구조</span>
                        <Badge className="bg-emerald-500 text-white text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          선택됨
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{preferredScenario.name}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {preferredScenario.explanation?.slice(0, 80)}...
                          </p>
                        </div>
                        {preferredScenario.isFounderCashoutCalculable && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-emerald-600">
                              {formatKRWBillions(preferredScenario.netBreakdown?.founderNetExpected || 0)}
                            </p>
                            <p className="text-xs text-slate-500">기대 순수익</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* 전문가 상담 및 중개법인 연결 (통합 폼) */}
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
