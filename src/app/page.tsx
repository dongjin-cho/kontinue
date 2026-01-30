"use client";

import Link from "next/link";
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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="container px-4 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center space-y-6">
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
                분석 프로세스
              </h2>
              <p className="text-slate-500">
                단계별로 심화된 분석을 제공해 드립니다
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Step 1 */}
              <Card className="relative border-slate-300 bg-slate-50">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <CardHeader className="pt-6">
                  <div className="inline-flex items-center gap-2 text-xs text-slate-500 mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    현재 이용 가능
                  </div>
                  <CardTitle className="text-slate-800">기업가치 평가</CardTitle>
                  <CardDescription className="text-base text-slate-600">
                    산업 분류, 매출, EBITDA 등 기본 정보를 바탕으로 
                    귀사의 기업가치 범위를 산출합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-slate-500" />
                      EV/EBITDA 기반 상대가치 평가
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-slate-500" />
                      기업 특성 보정 반영
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-slate-500" />
                      산출 근거 및 설명 제공
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Step 2 */}
              <Card className="relative border-slate-200 bg-white">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <CardHeader className="pt-6">
                  <div className="inline-flex items-center gap-2 text-xs text-slate-400 mb-2">
                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    Step 1 완료 후 이용 가능
                  </div>
                  <CardTitle className="text-slate-700">상세 분석</CardTitle>
                  <CardDescription className="text-base text-slate-500">
                    거래 구조, 경영 참여 조건 등을 반영하여 
                    예상 수령액을 분석합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-slate-500">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-slate-400" />
                      현금흐름 분석
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-slate-400" />
                      딜 구조 시나리오
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-slate-400" />
                      예상 수령액 산출
                    </li>
                  </ul>
                </CardContent>
              </Card>
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
