"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  TrendingUp,
  Wallet,
  Clock,
  AlertTriangle,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Step2V2Result } from "@/lib/simulations/types_v2";
import { formatKRWBillions } from "@/lib/valuation/formatter";

interface Step2ResultV2Props {
  result: Step2V2Result;
}

export function Step2ResultV2({ result }: Step2ResultV2Props) {
  // 첫 번째 시나리오만 사용 (단일 지분)
  const scenario = result.scenarios[0];
  const caseData = scenario?.cases.guaranteed; // 즉시 지급만 있으므로 guaranteed = expected = best

  if (!scenario || !caseData) {
    return null;
  }

  // 연도별 현금흐름 차트 데이터
  const cashflowData = caseData.cashflows.map((cf, t) => ({
    year: t === 0 ? "즉시" : `${t}년차`,
    amount: cf,
    isImmediate: t === 0,
  }));

  // 누적 현금흐름 계산
  let cumulative = 0;
  const cumulativeData = caseData.cashflows.map((cf, t) => {
    cumulative += cf;
    return {
      year: t === 0 ? "즉시" : `${t}년차`,
      cumulative,
    };
  });

  return (
    <div className="space-y-6">
      {/* 핵심 결과 */}
      <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-800">분석 결과</CardTitle>
          <CardDescription className="text-slate-500">
            귀사의 거래 조건에 따른 예상 수령액 분석입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 주요 지표 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <Wallet className="h-5 w-5" />
                <span className="text-sm font-medium">총 예상 수령액</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {formatKRWBillions(caseData.totalNominal)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                지분 {scenario.equityPct}% 기준
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm font-medium inline-flex items-center">
                  현재가치 (PV)
                  <InfoTooltip term="현재가치" />
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {formatKRWBillions(caseData.pv)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                할인율 {(result.basis.discountRate * 100).toFixed(0)}% 적용
              </p>
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">경영 참여 기간</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {result.basis.lockInYears}년
              </p>
              <p className="text-xs text-slate-500 mt-1">
                인수 후 경영 참여 예상 기간
              </p>
            </div>
          </div>

          {/* 현금흐름 타임라인 */}
          <div className="p-4 bg-slate-50 rounded-lg">
            <h4 className="font-medium text-slate-700 mb-4">연도별 예상 수령액</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="year" 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      value >= 100000000 ? `${(value / 100000000).toFixed(0)}억` : `${(value / 10000).toFixed(0)}만`
                    }
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value) => [formatKRWBillions(Number(value)), "수령액"]}
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {cashflowData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isImmediate ? "#475569" : "#94a3b8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              * 즉시 수령액: {formatKRWBillions(caseData.kpis.immediateAmount)} / 
              종료 시점 수령액: {formatKRWBillions(caseData.kpis.finalAmount)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 분석 요약 */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            분석 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 leading-relaxed">
            {result.explainText || `
              귀사의 기업가치 ${formatKRWBillions(result.basis.equityBasisValue)}를 기준으로,
              지분 ${scenario.equityPct}%를 매각하실 경우 총 ${formatKRWBillions(caseData.totalNominal)}의 
              수령이 예상됩니다. ${result.basis.lockInYears}년간의 경영 참여 기간과 
              ${(result.basis.discountRate * 100).toFixed(0)}% 할인율을 적용한 현재가치는 
              ${formatKRWBillions(caseData.pv)}입니다.
            `}
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-xs text-slate-500">PV/총액 비율</p>
              <p className="font-semibold text-slate-800">
                {(caseData.kpis.pvToTotalRatio * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">시간가치 할인</p>
              <p className="font-semibold text-slate-800">
                {formatKRWBillions(caseData.totalNominal - caseData.pv)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 참고 사항 */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-6">
          <h4 className="font-medium text-slate-700 mb-3">분석 가정</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">기준 가치</p>
              <p className="font-medium text-slate-700">
                {formatKRWBillions(result.basis.equityBasisValue)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">매각 지분</p>
              <p className="font-medium text-slate-700">{scenario.equityPct}%</p>
            </div>
            <div>
              <p className="text-slate-500">경영 참여</p>
              <p className="font-medium text-slate-700">{result.basis.lockInYears}년</p>
            </div>
            <div>
              <p className="text-slate-500">할인율</p>
              <p className="font-medium text-slate-700">{(result.basis.discountRate * 100).toFixed(0)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 경고 */}
      {result.warnings && result.warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <ul className="list-disc list-inside space-y-1">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-slate-400 text-center">
        * 아래 딜 구조 시나리오를 완료하시면 다음 단계로 진행할 수 있습니다.
      </p>
    </div>
  );
}
