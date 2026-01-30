"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Step2FormV2 } from "@/components/step2/Step2FormV2";
import { Step2ResultV2 } from "@/components/step2/Step2ResultV2";
import type { Step1Result } from "@/lib/valuation/types";
import type { Step2V2Result } from "@/lib/simulations/types_v2";
import { formatKRWBillions } from "@/lib/valuation/formatter";

export default function Step2Page() {
  const router = useRouter();
  const [step1Result, setStep1Result] = React.useState<Step1Result | null>(null);
  const [result, setResult] = React.useState<Step2V2Result | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const resultRef = React.useRef<HTMLDivElement>(null);

  // Load Step1 result and Step2 saved result from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStep1 = localStorage.getItem("sme_step1_result");
      const savedStep2 = localStorage.getItem("sme_step2_result_v2");

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link href="/app/step1">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Step 1
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <span className="font-semibold">Step 2: 현금흐름 시뮬레이션</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 px-4 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Step1 결과 요약 */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Step 1 평가 결과</CardDescription>
                <Badge variant="secondary">{step1Result.industryGroup}</Badge>
              </div>
              <CardTitle className="text-lg">
                예상 지분가치: {formatKRWBillions(step1Result.equityValue.low)} ~{" "}
                {formatKRWBillions(step1Result.equityValue.high)} 원
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-4">
                <span>
                  EV: {formatKRWBillions(step1Result.enterpriseValue.rangeLow)} ~{" "}
                  {formatKRWBillions(step1Result.enterpriseValue.rangeHigh)}
                </span>
                <span>순차입금: {formatKRWBillions(step1Result.netDebt)}</span>
                <span>멀티플: {step1Result.multiples.finalMedian.toFixed(1)}x</span>
              </div>
            </CardContent>
          </Card>

          {/* 입력 폼 (V2) */}
          <Step2FormV2 step1Result={step1Result} onResult={handleResult} />

          {/* 결과 패널 (V2) */}
          {result && (
            <div ref={resultRef} className="scroll-mt-20">
              <Step2ResultV2 result={result} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          <p>
            본 시뮬레이션은 참고용이며, 실제 거래 조건에 따라 달라질 수 있습니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
