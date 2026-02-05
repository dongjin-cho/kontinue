"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  ArrowRight,
  Briefcase,
  BarChart3,
  CheckCircle,
  Shield,
  TrendingUp,
  Lock,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();

  // Magic Link로 홈페이지에 도착한 경우 Step3로 리다이렉트
  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      // URL에 access_token이나 인증 관련 해시가 있는지 확인
      const hash = window.location.hash;
      const hasAuthParams = hash.includes("access_token") || hash.includes("token_type");
      
      if (hasAuthParams) {
        const supabase = getSupabaseBrowserClient();
        
        // 세션 확인
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // 인증 성공 - Step3로 리다이렉트
          router.replace("/app/step3");
        }
      }
    };

    checkAuthAndRedirect();
  }, [router]);
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="container px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* CI Logo */}
            <div className="flex justify-center mb-8">
              <Image
                src="/kontinue-logo.svg"
                alt="Kontinue"
                width={360}
                height={360}
                priority
              />
            </div>
            
            <p className="text-slate-400 text-sm tracking-widest uppercase">
              Private Valuation Advisory
            </p>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight">
              귀사의 기업가치,
              <br />
              <span className="font-semibold">신뢰할 수 있는 분석</span>으로
            </h1>
            
            <p className="text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
              복잡한 절차 없이 핵심 정보만으로
              <br className="hidden md:block" />
              기업가치 범위를 빠르게 확인하실 수 있습니다.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Link href="/app/step1">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-base h-14 px-8 bg-white text-slate-900 hover:bg-slate-100"
                >
                  <Briefcase className="mr-2 h-5 w-5" />
                  기업가치 분석 시작
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 pt-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="h-4 w-4" />
                비공개
              </span>
              <span>회원가입 불필요</span>
              <span>약 2분 소요</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-semibold text-slate-800 mb-3">
              분석 방법론
            </h2>
            <p className="text-slate-500">
              검증된 방법론을 기반으로 객관적인 가치평가를 제공합니다
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <BarChart3 className="h-6 w-6 text-slate-700" />
                </div>
                <CardTitle className="text-lg text-slate-800 inline-flex items-center">
                  EV/EBITDA 멀티플
                  <InfoTooltip term="EV/EBITDA" />
                </CardTitle>
                <CardDescription className="text-slate-500">
                  산업별 거래 사례를 기반으로 한 시장 배수를 적용하여 상대가치를 산출합니다.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <TrendingUp className="h-6 w-6 text-slate-700" />
                </div>
                <CardTitle className="text-lg text-slate-800">기업 특성 보정</CardTitle>
                <CardDescription className="text-slate-500">
                  성장률, 기업 규모, 업력 등 개별 기업의 특성을 반영하여 정확도를 높입니다.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 bg-white">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <Shield className="h-6 w-6 text-slate-700" />
                </div>
                <CardTitle className="text-lg text-slate-800 inline-flex items-center">
                  DLOM 적용
                  <InfoTooltip term="DLOM" />
                </CardTitle>
                <CardDescription className="text-slate-500">
                  비상장 기업의 유동성 특성을 반영하여 현실적인 가치를 제시합니다.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="bg-white border-y border-slate-200">
        <div className="container px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-semibold text-slate-800 mb-3">
                분석 단계
              </h2>
              <p className="text-slate-500">
                단계별로 심화된 분석을 제공해 드립니다
              </p>
            </div>

            {/* 3-Step Process */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">기업가치 평가</h3>
                <p className="text-sm text-slate-500">
                  산업 분류, 매출, EBITDA 등 기본 정보를 바탕으로 기업가치 범위를 산출합니다.
                </p>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">매각 시뮬레이션</h3>
                <p className="text-sm text-slate-500">
                  거래 조건과 경영 참여 기간을 반영하여 예상 수령액을 분석합니다.
                </p>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">재무제표 검증</h3>
                <p className="text-sm text-slate-500">
                  재무제표 업로드를 통해 분석 정확도를 높이고 전문가 연결을 지원합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-800 text-white border-0">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <Briefcase className="h-10 w-10 mx-auto text-slate-400" />
              <h3 className="text-xl font-semibold">
                지금 바로 시작하세요
              </h3>
              <p className="text-slate-300 text-sm">
                비공개로 진행되며, 약 2분이면 결과를 확인하실 수 있습니다.
              </p>
              <Link href="/app/step1">
                <Button
                  size="lg"
                  className="bg-white text-slate-800 hover:bg-slate-100 mt-2"
                >
                  기업가치 분석 시작
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="container py-8 px-4">
          <div className="max-w-4xl mx-auto text-center text-sm text-slate-400 space-y-2">
            <p>
              본 서비스는 참고용 정보 제공을 목적으로 하며, 
              투자 또는 거래 의사결정의 근거로 사용될 수 없습니다.
            </p>
            <p>
              실제 M&A 거래 시에는 전문가의 정밀 실사(Due Diligence)가 필요합니다.
            </p>
            <p className="pt-4 text-xs text-slate-300">
              © 2026 Kontinue. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
