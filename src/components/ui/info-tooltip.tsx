"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  term: string;
  className?: string;
}

/**
 * 전문용어 사전
 */
const GLOSSARY: Record<string, { title: string; description: string }> = {
  // Step1 관련
  "EV/EBITDA": {
    title: "EV/EBITDA 멀티플",
    description:
      "기업가치(Enterprise Value)를 EBITDA로 나눈 배수입니다. 동종 업계 기업들의 거래 사례를 기반으로 적정 배수를 적용하여 기업가치를 산정합니다.",
  },
  EBITDA: {
    title: "EBITDA",
    description:
      "Earnings Before Interest, Taxes, Depreciation and Amortization. 이자, 세금, 감가상각비 차감 전 영업이익으로, 기업의 실질적인 영업 현금창출 능력을 나타냅니다.",
  },
  "영업이익": {
    title: "영업이익",
    description:
      "매출액에서 매출원가와 판매관리비를 차감한 금액입니다. EBITDA와 달리 감가상각비가 포함되어 있어 일반적으로 EBITDA보다 낮습니다.",
  },
  DLOM: {
    title: "DLOM (비유동성 할인)",
    description:
      "Discount for Lack of Marketability. 비상장 기업은 상장 기업에 비해 매각이 어렵기 때문에 적용하는 할인율입니다. 일반적으로 15~30% 수준입니다.",
  },
  "Enterprise Value": {
    title: "기업가치 (EV)",
    description:
      "Enterprise Value. 기업 전체의 가치로, 주주가치(Equity Value)에 순부채를 더한 값입니다. 인수자 관점에서 기업을 인수하기 위해 필요한 총 금액입니다.",
  },
  "Equity Value": {
    title: "주주가치 (Equity Value)",
    description:
      "주주에게 귀속되는 기업의 가치입니다. 기업가치(EV)에서 순부채를 차감한 금액으로, 실제 매각 시 주주가 받게 되는 금액의 기준이 됩니다.",
  },
  "순부채": {
    title: "순부채 (Net Debt)",
    description:
      "총 차입금에서 현금 및 현금성 자산을 차감한 금액입니다. 기업가치에서 주주가치를 계산할 때 사용됩니다.",
  },
  "매출액": {
    title: "매출액 (Revenue)",
    description:
      "기업이 제품이나 서비스를 판매하여 얻은 총 수익입니다. 손익계산서의 최상단 항목으로, 기업 규모를 나타내는 기본 지표입니다.",
  },
  "매출 성장률": {
    title: "매출 성장률",
    description:
      "전년 대비 매출액의 증가율입니다. 높은 성장률은 기업가치 평가에서 프리미엄 요소로 작용합니다.",
  },
  
  // Step2 관련
  "Lock-in": {
    title: "Lock-in (락인)",
    description:
      "M&A 거래 후 핵심 인력이 일정 기간 회사에 잔류해야 하는 조건입니다. 락인 기간 동안 급여를 받으며, 기간 종료 후 잔여 대금을 수령합니다.",
  },
  "Escrow": {
    title: "Escrow (에스크로)",
    description:
      "거래 대금의 일부를 제3자(에스크로 기관)에 예치하는 것입니다. 인수 후 발생할 수 있는 우발채무나 진술보장 위반에 대비합니다.",
  },
  "Earnout": {
    title: "Earnout (어닌아웃)",
    description:
      "인수 후 특정 실적 목표 달성 시 추가로 지급되는 조건부 대가입니다. 매도자와 매수자 간 가치 평가 차이를 좁히는 데 활용됩니다.",
  },
  "할인율": {
    title: "할인율 (Discount Rate)",
    description:
      "미래 현금흐름을 현재가치로 환산할 때 사용하는 비율입니다. 위험이 높을수록 할인율이 높아지며, 현재가치는 낮아집니다.",
  },
  "현재가치": {
    title: "현재가치 (Present Value)",
    description:
      "미래에 받을 금액을 현재 시점의 가치로 환산한 것입니다. 할인율을 적용하여 계산하며, 미래 금액보다 항상 작습니다.",
  },
  "Net Proceeds": {
    title: "Net Proceeds (순수취액)",
    description:
      "모든 비용과 세금을 제외하고 실제로 손에 쥐게 되는 금액입니다. 거래 구조에 따라 크게 달라질 수 있습니다.",
  },
  
  // Step3 관련
  "재무제표": {
    title: "재무제표",
    description:
      "기업의 재무상태와 경영성과를 나타내는 보고서입니다. 손익계산서, 재무상태표, 현금흐름표 등이 포함됩니다.",
  },
  "손익계산서": {
    title: "손익계산서",
    description:
      "일정 기간 동안 기업의 수익과 비용을 나타내는 재무제표입니다. 매출액, 영업이익, 당기순이익 등을 확인할 수 있습니다.",
  },
  "재무상태표": {
    title: "재무상태표 (대차대조표)",
    description:
      "특정 시점의 기업 자산, 부채, 자본을 나타내는 재무제표입니다. 기업의 재무 건전성을 파악하는 데 사용됩니다.",
  },
  "중개법인": {
    title: "M&A 중개법인",
    description:
      "기업 매매를 전문으로 중개하는 회사입니다. 매도자와 매수자를 연결하고, 거래 협상 및 실사 과정을 지원합니다.",
  },
};

export function InfoTooltip({ term, className }: InfoTooltipProps) {
  const glossaryEntry = GLOSSARY[term];

  if (!glossaryEntry) {
    console.warn(`InfoTooltip: Unknown term "${term}"`);
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center w-4 h-4 ml-1 rounded-full",
            "text-muted-foreground hover:text-primary hover:bg-primary/10",
            "transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
            className
          )}
          aria-label={`${term} 설명 보기`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" side="top">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{glossaryEntry.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {glossaryEntry.description}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * 텍스트와 함께 사용하는 래퍼 컴포넌트
 */
interface TermWithInfoProps {
  children: React.ReactNode;
  term: string;
  className?: string;
}

export function TermWithInfo({ children, term, className }: TermWithInfoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {children}
      <InfoTooltip term={term} />
    </span>
  );
}
