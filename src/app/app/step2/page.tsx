"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Step2UnifiedForm } from "@/components/step2/Step2UnifiedForm";
import { Step2ResultV2 } from "@/components/step2/Step2ResultV2";
import { DealScenarioResults } from "@/components/deal/DealScenarioResults";
import type { Step1Result } from "@/lib/valuation/types";
import type { Step2V2Result } from "@/lib/simulations/types_v2";
import type { DealScenarioOutput } from "@/lib/deal/scenarios";
import { formatKRWBillions } from "@/lib/valuation/formatter";

export default function Step2Page() {
  const router = useRouter();
  const [step1Result, setStep1Result] = React.useState<Step1Result | null>(null);
  const [result, setResult] = React.useState<Step2V2Result | null>(null);
  const [dealResult, setDealResult] = React.useState<DealScenarioOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const resultRef = React.useRef<HTMLDivElement>(null);

  // Load Step1 result and saved results from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStep1 = localStorage.getItem("sme_step1_result");
      const savedStep2 = localStorage.getItem("sme_step2_result_v2");
      const savedDeal = localStorage.getItem("sme_deal_scenarios_result_v1");

      if (savedStep1) {
        try {
          const parsed = JSON.parse(savedStep1);
          setStep1Result(parsed);

          // 평가 불가인 경우 Step1으로 리다이렉트
          if (!parsed.canEvaluate) {
            router.push("/app/step1");
            return;
          }
        } catch {
          router.push("/app/step1");
          return;
        }
      } else {
        // Step1 결과가 없으면 리다이렉트
        router.push("/app/step1");
        return;
      }

      if (savedStep2) {
        try {
          setResult(JSON.parse(savedStep2));
        } catch {
          // ignore
        }
      }

      if (savedDeal) {
        try {
          setDealResult(JSON.parse(savedDeal));
        } catch {
          // ignore
        }
      }

      setIsLoading(false);
    }
  }, [router]);

  const handleCashflowResult = (newResult: Step2V2Result) => {
    setResult(newResult);
    if (typeof window !== "undefined") {
      localStorage.setItem("sme_step2_result_v2", JSON.stringify(newResult));
    }
  };

  const handleDealResult = (newResult: DealScenarioOutput) => {
    setDealResult(newResult);
    if (typeof window !== "undefined") {
      localStorage.setItem("sme_deal_scenarios_result_v1", JSON.stringify(newResult));
    }
    // 결과가 나오면 스크롤
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!step1Result || !step1Result.canEvaluate) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container py-12 px-4 max-w-2xl mx-auto">
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-red-800">기업가치 평가가 필요합니다</AlertTitle>
            <AlertDescription className="text-red-700">
              상세 분석을 진행하려면 먼저 기업가치 평가를 완료해 주십시오.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/app/step1">
              <Button className="bg-slate-800 hover:bg-slate-700">기업가치 평가로 이동</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <Link href="/app/step1">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
              이전 단계
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <span className="font-semibold text-slate-800">상세 분석</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 px-4 max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Step1 결과 요약 */}
          <Card className="border-slate-200 bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-slate-500">기업가치 평가 결과</CardDescription>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">{step1Result.industryGroup}</Badge>
              </div>
              <CardTitle className="text-lg text-slate-800">
                예상 지분가치: {formatKRWBillions(step1Result.equityValue.low)} ~ {formatKRWBillions(step1Result.equityValue.high)}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">
              <div className="flex flex-wrap gap-4">
                <span>
                  기업가치: {formatKRWBillions(step1Result.enterpriseValue.rangeLow)} ~ {formatKRWBillions(step1Result.enterpriseValue.rangeHigh)}
                </span>
                <span>순차입금: {formatKRWBillions(step1Result.netDebt)}</span>
                <span>적용 멀티플: {step1Result.multiples.finalMedian.toFixed(1)}x</span>
              </div>
            </CardContent>
          </Card>

          {/* 통합 입력 폼 */}
          <Step2UnifiedForm 
            step1Result={step1Result} 
            onCashflowResult={handleCashflowResult}
            onDealResult={handleDealResult} 
          />
          
          {/* 분석 결과 - 두 결과가 모두 있을 때만 표시 */}
          {result && dealResult && (
            <div ref={resultRef} className="scroll-mt-20 space-y-8">
              {/* 분석 결과 헤더 */}
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">분석 결과</h2>
                  <p className="text-sm text-slate-500">현금흐름 분석 및 딜 구조 시나리오</p>
                </div>
              </div>

              {/* 현금흐름 분석 결과 */}
              <Step2ResultV2 result={result} />

              {/* 딜 시나리오 결과 */}
              <DealScenarioResults result={dealResult} />

              {/* Step3로 이동 CTA */}
              <Card className="bg-slate-800 text-white border-0">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">다음 단계</h3>
                      <p className="text-sm text-slate-300">
                        재무제표를 업로드하시면 더 정확한 분석과 전문가 연결을 지원해 드립니다.
                      </p>
                    </div>
                    <Link href="/app/step3">
                      <Button size="lg" className="bg-white text-slate-800 hover:bg-slate-100">
                        재무제표 업로드
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 bg-white">
        <div className="container py-6 text-center text-sm text-slate-400">
          <p>
            본 분석 결과는 참고 자료이며, 실제 거래 조건에 따라 달라질 수 있습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
