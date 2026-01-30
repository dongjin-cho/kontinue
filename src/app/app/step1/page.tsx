"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Step1Form } from "@/components/step1/Step1Form";
import { ValuationResult } from "@/components/step1/ValuationResult";
import type { Step1Result } from "@/lib/valuation/types";

export default function Step1Page() {
  const [result, setResult] = React.useState<Step1Result | null>(null);
  const resultRef = React.useRef<HTMLDivElement>(null);

  // Load saved result on mount
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedResult = localStorage.getItem("sme_step1_result");
      if (savedResult) {
        try {
          setResult(JSON.parse(savedResult));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleResult = (newResult: Step1Result) => {
    setResult(newResult);
    // Scroll to result
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
              처음으로
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <span className="font-semibold text-slate-800">기업가치 평가</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 px-4 max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* 입력 폼 */}
          <Step1Form onResult={handleResult} />

          {/* 결과 패널 */}
          {result && (
            <div ref={resultRef} className="scroll-mt-20">
              <ValuationResult result={result} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 mt-12 bg-white">
        <div className="container py-6 text-center text-sm text-slate-400">
          <p>
            본 결과는 참고 자료이며, 실제 M&A 거래 시에는 전문가의 정밀 실사가 필요합니다.
          </p>
        </div>
      </footer>
    </div>
  );
}
