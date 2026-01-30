import { NextRequest, NextResponse } from "next/server";
import { Step2V2InputSchema, type Step2V2ApiResponse } from "@/lib/simulations/types_v2";
import { simulateStep2V2 } from "@/lib/simulations/step2_v2";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // snake_case → camelCase 변환
    const input = {
      equityBasisValue: body.equity_basis_value,
      valuationBasis: body.valuation_basis || "mid",
      lockInYears: body.lock_in_years,
      equityScenarios: body.equity_scenarios,
      payout: {
        upfrontPct: body.payout?.upfront_pct,
        escrowPct: body.payout?.escrow_pct,
        earnoutPct: body.payout?.earnout_pct,
      },
      discountRate: body.discount_rate,
      escrowScheduleMode: body.escrow_schedule_mode || "lump_sum_end",
      escrowSchedule: body.escrow_schedule?.map((item: Record<string, unknown>) => ({
        year: item.year,
        pctOfTotal: item.pct_of_total,
        probability: item.probability,
      })),
      escrowProbability: body.escrow_probability ?? 0.9,
      earnoutScheduleMode: body.earnout_schedule_mode || "equal_annual",
      earnoutSchedule: body.earnout_schedule?.map((item: Record<string, unknown>) => ({
        year: item.year,
        pctOfTotal: item.pct_of_total,
        probability: item.probability ?? 0.6,
      })),
    };

    // 입력 검증
    const parseResult = Step2V2InputSchema.safeParse(input);

    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      const response: Step2V2ApiResponse = {
        success: false,
        errors,
      };

      return NextResponse.json(response, { status: 400 });
    }

    // 시뮬레이션 실행
    const result = simulateStep2V2(parseResult.data);

    // 응답 (snake_case로 변환)
    const response = {
      success: true,
      data: {
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
        inputs_echo: {
          equity_basis_value: result.inputsEcho.equityBasisValue,
          valuation_basis: result.inputsEcho.valuationBasis,
          lock_in_years: result.inputsEcho.lockInYears,
          equity_scenarios: result.inputsEcho.equityScenarios,
          discount_rate: result.inputsEcho.discountRate,
          payout: {
            upfront_pct: result.inputsEcho.payout.upfrontPct,
            escrow_pct: result.inputsEcho.payout.escrowPct,
            earnout_pct: result.inputsEcho.payout.earnoutPct,
          },
          escrow_schedule_mode: result.inputsEcho.escrowScheduleMode,
          escrow_probability: result.inputsEcho.escrowProbability,
          earnout_schedule_mode: result.inputsEcho.earnoutScheduleMode,
        },
        scenarios: result.scenarios.map((s) => ({
          equity_pct: s.equityPct,
          total_proceeds: s.totalProceeds,
          cases: {
            guaranteed: {
              cashflows: s.cases.guaranteed.cashflows,
              total_nominal: s.cases.guaranteed.totalNominal,
              pv: s.cases.guaranteed.pv,
              kpis: {
                immediate_amount: s.cases.guaranteed.kpis.immediateAmount,
                final_amount: s.cases.guaranteed.kpis.finalAmount,
                pv_to_total_ratio: s.cases.guaranteed.kpis.pvToTotalRatio,
              },
            },
            expected: {
              cashflows: s.cases.expected.cashflows,
              total_nominal: s.cases.expected.totalNominal,
              pv: s.cases.expected.pv,
              kpis: {
                immediate_amount: s.cases.expected.kpis.immediateAmount,
                final_amount: s.cases.expected.kpis.finalAmount,
                pv_to_total_ratio: s.cases.expected.kpis.pvToTotalRatio,
              },
            },
            best: {
              cashflows: s.cases.best.cashflows,
              total_nominal: s.cases.best.totalNominal,
              pv: s.cases.best.pv,
              kpis: {
                immediate_amount: s.cases.best.kpis.immediateAmount,
                final_amount: s.cases.best.kpis.finalAmount,
                pv_to_total_ratio: s.cases.best.kpis.pvToTotalRatio,
              },
            },
          },
        })),
        warnings: result.warnings,
        explain_text: result.explainText,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Step2 V2 API error:", error);
    return NextResponse.json(
      { success: false, errors: [{ field: "server", message: "Server error" }] },
      { status: 500 }
    );
  }
}
