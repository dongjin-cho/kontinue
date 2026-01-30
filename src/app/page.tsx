import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Building2,
  Calculator,
  ChartBar,
  CheckCircle2,
  Clock,
  Shield,
  TrendingUp,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Hero Section */}
      <section className="container px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            SME 사장님을 위한 기업가치 평가
          </Badge>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
            내 회사, <span className="text-primary">대략 얼마</span>일까?
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            복잡한 재무 분석 없이, 최소한의 정보만으로
            <br className="hidden md:block" />
            귀사의 기업가치 범위를 빠르게 확인하세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/app/step1">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 font-semibold">
                <Calculator className="mr-2 h-5 w-5" />
                약식 기업가치 평가 시작
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            무료 · 회원가입 없음 · 2분 소요
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            어떻게 계산하나요?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <ChartBar className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">EV/EBITDA 멀티플</CardTitle>
                <CardDescription>
                  산업별 거래 사례 기반의 시장 배수를 적용하여 상대가치를 산출합니다.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">기업 특성 보정</CardTitle>
                <CardDescription>
                  성장률, 기업 규모, 업력 등 개별 기업의 특성을 반영하여 정확도를 높입니다.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">DLOM 적용</CardTitle>
                <CardDescription>
                  비상장 기업의 유동성 부족에 대한 할인(DLOM)을 반영하여 현실적인 가치를 제시합니다.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="container px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            간단한 2단계 프로세스
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Step 1 */}
            <Card className="relative border-primary/20 bg-primary/5">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                1
              </div>
              <CardHeader className="pt-8">
                <Badge className="w-fit">현재 제공</Badge>
                <CardTitle>약식 기업가치 평가</CardTitle>
                <CardDescription className="text-base">
                  산업 분류, 매출, EBITDA 등 기본 정보만 입력하면 
                  귀사의 기업가치 범위를 즉시 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    EV/EBITDA 기반 상대가치 평가
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    기업 특성 보정 반영
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    결과 범위 + 근거 설명
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="relative opacity-75">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <CardHeader className="pt-8">
                <Badge variant="secondary" className="w-fit">
                  <Clock className="h-3 w-3 mr-1" />
                  준비중
                </Badge>
                <CardTitle>상세 분석 및 Net Proceeds</CardTitle>
                <CardDescription className="text-base">
                  거래 구조, 락인 조건, 세금 효과까지 반영하여 
                  실제로 손에 쥐게 될 금액을 계산합니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    거래 구조 시뮬레이션
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    세금/비용 반영
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Net Proceeds 계산
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <Building2 className="h-12 w-12 mx-auto opacity-90" />
              <h3 className="text-2xl font-bold">
                지금 바로 시작하세요
              </h3>
              <p className="opacity-90">
                복잡한 절차 없이, 2분 만에 기업가치를 확인할 수 있습니다.
              </p>
              <Link href="/app/step1">
                <Button
                  size="lg"
                  variant="secondary"
                  className="font-semibold mt-2"
                >
                  기업가치 평가 시작하기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container py-8 px-4">
          <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground space-y-2">
            <p>
              본 서비스는 참고용 정보 제공을 목적으로 하며, 
              투자 또는 거래 의사결정의 근거로 사용될 수 없습니다.
            </p>
            <p>
              실제 M&A 거래 시에는 반드시 전문가의 정밀 실사(Due Diligence)가 필요합니다.
            </p>
            <p className="pt-4 text-xs">
              © 2026 Kontinue. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
