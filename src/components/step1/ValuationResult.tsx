"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  AlertTriangle,
  ChevronRight,
  Info,
  Users,
  Calendar,
  Percent,
  ArrowRight,
} from "lucide-react";
import type { Step1Result } from "@/lib/valuation/types";
import { formatKRWBillions, formatPercent } from "@/lib/valuation/formatter";
import { cn } from "@/lib/utils";

interface ValuationResultProps {
  result: Step1Result;
}

export function ValuationResult({ result }: ValuationResultProps) {
  // EBITDA <= 0 인 경우 평가 불가
  if (!result.canEvaluate) {
    return (
      <Card className="w-full border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            평가 불가
          </CardTitle>
          <CardDescription>{result.fallbackReason}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>안내</AlertTitle>
            <AlertDescription>{result.explainText}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Link href="/app/step2" className="w-full">
            <Button variant="outline" className="w-full">
              2단계에서 다른 평가 방법 알아보기
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const { multiples, adjustments, enterpriseValue, equityValue, netDebt } = result;

  return (
    <div className="space-y-4">
      {/* 주요 결과 카드 */}
      <Card className="w-full border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {result.valuationMethod}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {result.industryGroup}
            </Badge>
          </div>
          <CardTitle className="text-xl mt-2">예상 기업가치 범위</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 기업가치 (EV) */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">기업가치 (Enterprise Value)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">
                {formatKRWBillions(enterpriseValue.rangeLow)}
              </span>
              <span className="text-xl text-muted-foreground">~</span>
              <span className="text-3xl font-bold text-primary">
                {formatKRWBillions(enterpriseValue.rangeHigh)}
              </span>
              <span className="text-lg text-muted-foreground">원</span>
            </div>
          </div>

          <Separator />

          {/* 지분가치 (Equity) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                지분가치 (Equity Value)
              </p>
              <Badge variant="outline" className="text-xs">
                순차입금 {netDebt > 0 ? "-" : "+"}{formatKRWBillions(Math.abs(netDebt))}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">
                {formatKRWBillions(equityValue.low)}
              </span>
              <span className="text-2xl text-muted-foreground">~</span>
              <span className="text-4xl font-bold">
                {formatKRWBillions(equityValue.high)}
              </span>
              <span className="text-xl text-muted-foreground">원</span>
            </div>
            <p className="text-xs text-muted-foreground">
              * 순차입금(총 차입금 - 현금) 반영 후 주주 귀속 가치
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 상세 분석 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-4 w-4" />
            왜 이렇게 나왔나요?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 멀티플 정보 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">적용 멀티플</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Low</p>
                <p className="text-lg font-semibold">{multiples.finalLow.toFixed(1)}x</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                <p className="text-xs text-muted-foreground">Median</p>
                <p className="text-lg font-bold text-primary">{multiples.finalMedian.toFixed(1)}x</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">High</p>
                <p className="text-lg font-semibold">{multiples.finalHigh.toFixed(1)}x</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              산업군 멀티플 ({multiples.weights.industry * 100}%) + 
              Peer 멀티플 ({multiples.weights.peer * 100}%, DLOM {multiples.dlom * 100}% 적용)
            </p>
          </div>

          <Separator />

          {/* 보정 요인 */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">기업 특성 보정</h4>
            <div className="space-y-2">
              <AdjustmentItem
                icon={<TrendingUp className="h-4 w-4" />}
                label="성장률 보정"
                value={adjustments.growthAdj}
              />
              <AdjustmentItem
                icon={<Users className="h-4 w-4" />}
                label="규모 보정"
                value={adjustments.sizeAdj}
              />
              <AdjustmentItem
                icon={<Calendar className="h-4 w-4" />}
                label="업력 보정"
                value={adjustments.ageAdj}
              />
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium text-sm">총 보정률</span>
                <span
                  className={cn(
                    "font-bold",
                    adjustments.totalAdj > 0
                      ? "text-green-600"
                      : adjustments.totalAdj < 0
                      ? "text-red-600"
                      : ""
                  )}
                >
                  {formatPercent(adjustments.totalAdj, true)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* 설명문 */}
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-sm leading-relaxed">{result.explainText}</p>
          </div>

          {/* 경고 */}
          {result.warnings.length > 0 && (
            <Alert className="border-yellow-500/50 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-sm">주의사항</AlertTitle>
              <AlertDescription>
                <ul className="text-xs list-disc list-inside space-y-1 mt-1">
                  {result.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* CTA 카드 */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
        <CardContent className="pt-6">
          <h3 className="text-xl font-bold mb-2">
            더 정확한 금액과 내가 실제로 손에 쥘 현금이 궁금하신가요?
          </h3>
          <p className="text-sm opacity-90 mb-4">
            2단계에서 거래구조, 락인 조건, 세금 효과까지 반영한 상세 분석을 확인하세요.
          </p>
          <Link href="/app/step2">
            <Button
              size="lg"
              variant="secondary"
              className="w-full font-semibold"
            >
              2단계(락인/지급구조)로 진행
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

// 보정 항목 컴포넌트
function AdjustmentItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  const isNeutral = value === 0;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {isPositive && <TrendingUp className="h-3 w-3 text-green-600" />}
        {isNegative && <TrendingDown className="h-3 w-3 text-red-600" />}
        <span
          className={cn(
            "font-medium",
            isPositive && "text-green-600",
            isNegative && "text-red-600",
            isNeutral && "text-muted-foreground"
          )}
        >
          {formatPercent(value, true)}
        </span>
      </div>
    </div>
  );
}
