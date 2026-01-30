"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2, Calculator, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Step2FormV2 } from "@/components/step2/Step2FormV2";
import { Step2ResultV2 } from "@/components/step2/Step2ResultV2";
import { DealScenarioForm } from "@/components/deal/DealScenarioForm";
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
  const [activeTab, setActiveTab] = React.useState("pv-simulation");
  const resultRef = React.useRef<HTMLDivElement>(null);
  const dealResultRef = React.useRef<HTMLDivElement>(null);

  // Load Step1 result and Step2 saved result from localStorage
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

  const handleResult = (newResult: Step2V2Result) => {
    setResult(newResult);
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("sme_step2_result_v2", JSON.stringify(newResult));
    }
    // Scroll to result
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDealResult = (newResult: DealScenarioOutput) => {
    setDealResult(newResult);
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("sme_deal_scenarios_result_v1", JSON.stringify(newResult));
    }
    // Scroll to result
    setTimeout(() => {
      dealResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!step1Result || !step1Result.canEvaluate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container py-12 px-4 max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Step1 결과가 필요합니다</AlertTitle>
            <AlertDescription>
              Step2를 진행하려면 먼저 Step1에서 기업가치 평가를 완료해주세요.
            </AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/app/step1">
              <Button>Step1으로 이동</Button>
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
        <div className="space-y-6">
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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100">
              <TabsTrigger value="pv-simulation" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-800">
                <Calculator className="h-4 w-4" />
                현금흐름 분석
              </TabsTrigger>
              <TabsTrigger value="deal-scenarios" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-800">
                <FileText className="h-4 w-4" />
                딜 구조 시나리오
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: 현금흐름 분석 */}
            <TabsContent value="pv-simulation" className="space-y-6 mt-6">
              <Step2FormV2 step1Result={step1Result} onResult={handleResult} />
              {result && (
                <div ref={resultRef} className="scroll-mt-20">
                  <Step2ResultV2 result={result} />
                </div>
              )}
            </TabsContent>

            {/* Tab 2: 딜 구조 시나리오 */}
            <TabsContent value="deal-scenarios" className="space-y-6 mt-6">
              <DealScenarioForm step1Result={step1Result} onResult={handleDealResult} />
              {dealResult && (
                <div ref={dealResultRef} className="scroll-mt-20">
                  <DealScenarioResults result={dealResult} />
                </div>
              )}
            </TabsContent>
          </Tabs>
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
