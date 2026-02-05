"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import type { Step2V2Result } from "@/lib/simulations/types_v2";

interface Step2ResultV2Props {
  result: Step2V2Result;
}

// 숫자 포맷팅 함수
function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function formatBillions(value: number): string {
  const billions = value / 100000000;
  return `${billions.toFixed(1)}억`;
}

export function Step2ResultV2({ result }: Step2ResultV2Props) {
  const scenario = result.scenarios[0];
  const caseData = scenario?.cases.expected; // expected 케이스 사용

  if (!scenario || !caseData) {
    return null;
  }

  const { basis } = result;
  const totalValue = basis.equityBasisValue * (scenario.equityPct / 100);
  const upfrontPct = basis.payout.upfrontPct;
  const escrowPct = basis.payout.escrowPct;
  const earnoutPct = basis.payout.earnoutPct;
  
  const upfrontAmount = totalValue * (upfrontPct / 100);
  const escrowAmount = totalValue * (escrowPct / 100);
  const earnoutAmount = totalValue * (earnoutPct / 100);

  return (
    <div className="space-y-6">
      {/* 1. 기본 딜 조건 설정 */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">1. 기본 딜 조건 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600 bg-slate-50">항목</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600 bg-slate-50">입력값</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600 bg-slate-50">비고</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-3 text-slate-700">기업 가치 (Equity Value)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {formatNumber(basis.equityBasisValue)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">({formatBillions(basis.equityBasisValue)})</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-3 text-slate-700">매각 지분율</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {scenario.equityPct}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">창업자 보유 지분</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-3 text-slate-700">현금 지급 비율 (Upfront)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {upfrontPct}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">즉시 지급</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-3 text-slate-700">에스크로 비율 (Escrow)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {escrowPct}%
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">Lock-in 종료 시 지급</td>
                </tr>
                {earnoutPct > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-3 text-slate-700">언아웃 비율 (Earn-out)</td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                      {earnoutPct}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">성과 조건부</td>
                  </tr>
                )}
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-3 text-slate-700">락인 기간 (Lock-in)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {basis.lockInYears}년
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">경영 참여 기간</td>
                </tr>
                <tr className="border-b border-slate-100 bg-emerald-50">
                  <td className="py-2.5 px-3 text-emerald-700 font-medium">현금 수령액 (확정)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                    {formatNumber(upfrontAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-emerald-600">{formatBillions(upfrontAmount)} (즉시 지급)</td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="py-2.5 px-3 text-blue-700 font-medium">에스크로 유보액</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">
                    {formatNumber(escrowAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-blue-600">{formatBillions(escrowAmount)} ({basis.lockInYears}년 후 지급)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 2. 연도별 수령 스케줄 */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">2. 연도별 수령 스케줄</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600 bg-slate-50">시점</th>
                  {caseData.cashflows.map((_, t) => (
                    <th key={t} className="text-right py-2 px-3 font-medium text-slate-600 bg-slate-50 min-w-[100px]">
                      {t === 0 ? "클로징 시" : `${t}년차`}
                    </th>
                  ))}
                  <th className="text-right py-2 px-3 font-medium text-slate-600 bg-slate-50 min-w-[120px]">합계</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2.5 px-3 text-slate-700">수령액</td>
                  {caseData.cashflows.map((cf, t) => (
                    <td key={t} className={`py-2.5 px-3 text-right font-mono ${cf > 0 ? "font-medium text-slate-800" : "text-slate-400"}`}>
                      {cf > 0 ? formatBillions(cf) : "-"}
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                    {formatBillions(caseData.totalNominal)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 text-slate-700">현재가치 (PV)</td>
                  {caseData.cashflows.map((cf, t) => {
                    const pv = cf / Math.pow(1 + basis.discountRate, t);
                    return (
                      <td key={t} className={`py-2.5 px-3 text-right font-mono ${cf > 0 ? "text-slate-600" : "text-slate-400"}`}>
                        {cf > 0 ? formatBillions(pv) : "-"}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-600">
                    {formatBillions(caseData.pv)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            * 현재가치는 할인율 {(basis.discountRate * 100).toFixed(0)}%를 적용하여 계산됨
          </p>
        </CardContent>
      </Card>

      {/* 3. 최종 정산 */}
      <Card className="border-slate-200 bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-800">3. 최종 정산</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600 bg-white">항목</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600 bg-white">결과값</th>
                  <th className="text-left py-2 px-3 font-medium text-slate-600 bg-white">적용 수식</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100 bg-white">
                  <td className="py-2.5 px-3 text-slate-700">① 즉시 현금 수령 (Upfront)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-600">
                    {formatBillions(upfrontAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-xs">
                    {formatNumber(upfrontAmount)}
                  </td>
                </tr>
                <tr className="border-b border-slate-100 bg-white">
                  <td className="py-2.5 px-3 text-slate-700">② 에스크로 수령 ({basis.lockInYears}년 후)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-blue-600">
                    {formatBillions(escrowAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-xs">
                    {formatNumber(escrowAmount)}
                  </td>
                </tr>
                <tr className="border-b border-slate-100 bg-white">
                  <td className="py-2.5 px-3 text-slate-700">③ 명목 총 수령액</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800">
                    {formatBillions(caseData.totalNominal)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono text-xs">
                    ① + ②
                  </td>
                </tr>
                <tr className="bg-blue-50">
                  <td className="py-3 px-3 text-blue-700 font-semibold">④ 현재가치 합계 (PV)</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 text-lg">
                    {formatBillions(caseData.pv)}
                  </td>
                  <td className="py-3 px-3 text-blue-600 text-xs">
                    할인율 {(basis.discountRate * 100).toFixed(0)}% 적용
                  </td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="py-2.5 px-3 text-amber-700">시간가치 차이</td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium text-amber-600">
                    -{formatBillions(caseData.totalNominal - caseData.pv)}
                  </td>
                  <td className="py-2.5 px-3 text-amber-600 text-xs">
                    ({(caseData.kpis.pvToTotalRatio * 100).toFixed(1)}% 보존율)
                  </td>
                </tr>
              </tbody>
            </table>
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
    </div>
  );
}
