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
  FileText,
  Users,
  Calendar,
  ArrowRight,
  CheckCircle,
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
      <Card className="w-full border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            평가 불가
          </CardTitle>
          <CardDescription className="text-amber-600">{result.fallbackReason}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-200 bg-white">
            <FileText className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-slate-800">안내</AlertTitle>
            <AlertDescription className="text-slate-600">{result.explainText}</AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Link href="/app/step2" className="w-full">
            <Button variant="outline" className="w-full border-slate-300 text-slate-700 hover:bg-slate-50">
              다른 평가 방법 확인
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const { multiples, adjustments, enterpriseValue, equityValue, netDebt } = result;

  return (
    <div className="space-y-6">
      {/* 주요 결과 카드 */}
      <Card className="w-full border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
              {result.valuationMethod}
            </Badge>
            <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
              <Building2 className="h-3 w-3 mr-1" />
              {result.industryGroup}
            </Badge>
          </div>
          <CardTitle className="text-xl mt-3 text-slate-800">분석 결과</CardTitle>
          <CardDescription className="text-slate-500">
            귀사의 예상 기업가치 범위입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 기업가치 (EV) */}
          <div className="p-4 bg-white rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 mb-2">기업가치 (Enterprise Value)</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-800">
                {formatKRWBillions(enterpriseValue.rangeLow)}
              </span>
              <span className="text-lg text-slate-400">~</span>
              <span className="text-2xl font-bold text-slate-800">
                {formatKRWBillions(enterpriseValue.rangeHigh)}
              </span>
            </div>
          </div>

          {/* 지분가치 (Equity) */}
          <div className="p-4 bg-slate-800 rounded-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-300">
                지분가치 (Equity Value)
              </p>
              <Badge className="text-xs bg-slate-700 text-slate-300">
                순차입금 {netDebt > 0 ? "-" : "+"}{formatKRWBillions(Math.abs(netDebt))}
              </Badge>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {formatKRWBillions(equityValue.low)}
              </span>
              <span className="text-xl text-slate-400">~</span>
              <span className="text-3xl font-bold">
                {formatKRWBillions(equityValue.high)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              * 순차입금(총 차입금 - 현금) 반영 후 주주 귀속 가치
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 상세 분석 카드 */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
            <FileText className="h-4 w-4 text-slate-600" />
            분석 근거
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 멀티플 정보 */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-slate-700">적용 멀티플</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-xs text-slate-500">Low</p>
                <p className="text-lg font-semibold text-slate-700">{multiples.finalLow.toFixed(1)}x</p>
              </div>
              <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
                <p className="text-xs text-slate-500">Median</p>
                <p className="text-lg font-bold text-slate-800">{multiples.finalMedian.toFixed(1)}x</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                <p className="text-xs text-slate-500">High</p>
                <p className="text-lg font-semibold text-slate-700">{multiples.finalHigh.toFixed(1)}x</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">
              산업군 멀티플 ({multiples.weights.industry * 100}%) + 
              Peer 멀티플 ({multiples.weights.peer * 100}%, DLOM {multiples.dlom * 100}% 적용)
            </p>
          </div>

          <Separator className="bg-slate-100" />

          {/* 보정 요인 */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-slate-700">기업 특성 보정</h4>
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
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="font-medium text-sm text-slate-700">총 보정률</span>
                <span
                  className={cn(
                    "font-bold",
                    adjustments.totalAdj > 0
                      ? "text-emerald-600"
                      : adjustments.totalAdj < 0
                      ? "text-red-600"
                      : "text-slate-600"
                  )}
                >
                  {formatPercent(adjustments.totalAdj, true)}
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          {/* 설명문 */}
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm leading-relaxed text-slate-600">{result.explainText}</p>
          </div>

          {/* 경고 */}
          {result.warnings.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-sm text-amber-800">참고사항</AlertTitle>
              <AlertDescription>
                <ul className="text-xs list-disc list-inside space-y-1 mt-1 text-amber-700">
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
      <Card className="bg-slate-800 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-semibold">다음 단계</h3>
          </div>
          <p className="text-sm text-slate-300 mb-4">
            거래 조건에 따른 예상 수령액과 다양한 딜 구조 시나리오를 확인해 보시겠습니까?
          </p>
          <Link href="/app/step2">
            <Button
              size="lg"
              className="w-full bg-white text-slate-800 hover:bg-slate-100 font-semibold"
            >
              매각 시뮬레이션 진행
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 text-center">
        본 결과는 입력하신 정보를 기반으로 한 참고 자료이며, 실제 거래 시에는 전문가의 정밀 실사가 필요합니다.
      </p>
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
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {isPositive && <TrendingUp className="h-3 w-3 text-emerald-600" />}
        {isNegative && <TrendingDown className="h-3 w-3 text-red-600" />}
        <span
          className={cn(
            "font-medium",
            isPositive && "text-emerald-600",
            isNegative && "text-red-600",
            isNeutral && "text-slate-500"
          )}
        >
          {formatPercent(value, true)}
        </span>
      </div>
    </div>
  );
}
