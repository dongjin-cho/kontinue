import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { simulateStep2 } from "@/lib/simulations/step2";

// API용 입력 스키마 (camelCase -> 내부 변환)
const ApiInputSchema = z.object({
  equity_basis_value: z.number().positive("기준 지분가치는 0보다 커야 합니다"),
  valuation_basis: z.enum(["low", "mid", "high"]).default("mid"),
  lock_in_years: z.union([z.literal(1), z.literal(3), z.literal(5)]),
  equity_scenarios: z
    .array(z.number().int().min(1).max(100))
    .min(1, "최소 1개의 시나리오가 필요합니다")
    .max(10, "최대 10개의 시나리오까지 가능합니다"),
  payout: z.object({
    upfront_pct: z.number().min(0).max(100),
    escrow_pct: z.number().min(0).max(100),
    earnout_pct: z.number().min(0).max(100),
  }),
  discount_rate: z.number().min(0.08, "할인율은 8% 이상이어야 합니다").max(0.20, "할인율은 20% 이하여야 합니다"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod 검증
    const parseResult = ApiInputSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    }
    
    const data = parseResult.data;
    
    // 지급 구조 합계 검증
    const payoutSum = data.payout.upfront_pct + data.payout.escrow_pct + data.payout.earnout_pct;
    if (Math.abs(payoutSum - 100) >= 0.01) {
      return NextResponse.json(
        {
          success: false,
          errors: [
            {
              field: "payout",
              message: `지급 구조의 합계가 100%여야 합니다 (현재: ${payoutSum.toFixed(1)}%)`,
            },
          ],
        },
        { status: 400 }
      );
    }
    
    // 내부 형식으로 변환
    const input = {
      equityBasisValue: data.equity_basis_value,
      valuationBasis: data.valuation_basis,
      lockInYears: data.lock_in_years,
      equityScenarios: data.equity_scenarios,
      payout: {
        upfrontPct: data.payout.upfront_pct,
        escrowPct: data.payout.escrow_pct,
        earnoutPct: data.payout.earnout_pct,
      },
      discountRate: data.discount_rate,
    };
    
    // 시뮬레이션 실행
    const result = simulateStep2(input);
    
    // API 응답 형식으로 변환 (snake_case)
    const apiResponse = {
      basis: {
        equity_basis_value: result.basis.equityBasisValue,
        valuation_basis: result.basis.valuationBasis,
        lock_in_years: result.basis.lockInYears,
        discount_rate: result.basis.discountRate,
        payout: {
          upfront_pct: result.basis.payout.upfrontPct,
          escrow_pct: result.basis.payout.escrowPct,
          earnout_pct: result.basis.payout.earnoutPct,
        },
      },
      scenarios: result.scenarios.map((s) => ({
        equity_pct: s.equityPct,
        total_proceeds: s.totalProceeds,
        pv: s.pv,
        cashflows: s.cashflows,
        kpis: {
          immediate_amount: s.kpis.immediateAmount,
          final_amount: s.kpis.finalAmount,
          pv_to_total_ratio: s.kpis.pvToTotalRatio,
        },
      })),
      warnings: result.warnings,
      explain_text: result.explainText,
    };
    
    return NextResponse.json({
      success: true,
      data: apiResponse,
    });
  } catch (error) {
    console.error("Step2 simulation API error:", error);
    
    return NextResponse.json(
      {
        success: false,
        errors: [{ field: "general", message: "서버 오류가 발생했습니다." }],
      },
      { status: 500 }
    );
  }
}
