import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateDealScenarios,
  type DealScenarioInput,
  type DealScenarioOutput,
} from "@/lib/deal/scenarios";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Request Schema
const CapTableSchema = z.object({
  founderShare: z.number().min(0).max(100),
  investorShare: z.number().min(0).max(100),
  optionPool: z.number().min(0).max(100),
});

const DealScenarioRequestSchema = z.object({
  // Step1 결과
  equityValueLow: z.number().positive(),
  equityValueHigh: z.number().positive(),
  equityValueMedian: z.number().positive().optional(),

  // Cap Table
  capTable: CapTableSchema,

  // 거래 전제 조건
  hopeToSell: z.enum(["전량", "일부"]),
  expectedExitDate: z.string().optional(),
  secondaryRatio: z.number().min(0).max(100).default(100),
  primaryIssue: z.boolean().default(false),

  // 보조 정보
  revenueGrowth: z.number().default(0),
  ebitdaTrend: z.enum(["상승", "보합", "변동"]).default("보합"),
  companyProfile: z.string().default(""),

  // 계산 기준
  escrowAssumption: z.number().min(0).max(1).optional(),
  earnoutProbability: z.number().min(0).max(1).optional(),
  feeRate: z.number().min(0).max(1).optional(),
  taxRate: z.number().min(0).max(1).optional(),

  // 저장 옵션
  saveToServer: z.boolean().default(true),
  runId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    const parseResult = DealScenarioRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Cap Table 합계 검증
    const capTableSum =
      input.capTable.founderShare +
      input.capTable.investorShare +
      input.capTable.optionPool;

    if (Math.abs(capTableSum - 100) > 0.01) {
      return NextResponse.json(
        {
          success: false,
          error: "Cap Table 합계가 100%여야 합니다",
          details: { sum: capTableSum },
        },
        { status: 400 }
      );
    }

    // Generate scenarios
    const scenarioInput: DealScenarioInput = {
      equityValueLow: input.equityValueLow,
      equityValueHigh: input.equityValueHigh,
      equityValueMedian: input.equityValueMedian,
      capTable: input.capTable,
      hopeToSell: input.hopeToSell,
      expectedExitDate: input.expectedExitDate,
      secondaryRatio: input.secondaryRatio,
      primaryIssue: input.primaryIssue,
      revenueGrowth: input.revenueGrowth,
      ebitdaTrend: input.ebitdaTrend,
      companyProfile: input.companyProfile,
      escrowAssumption: input.escrowAssumption,
      earnoutProbability: input.earnoutProbability,
      feeRate: input.feeRate,
      taxRate: input.taxRate,
    };

    const result: DealScenarioOutput = generateDealScenarios(scenarioInput);

    // 서버에 저장 (옵션)
    if (input.saveToServer) {
      try {
        await saveToDatabase(input, result);
      } catch (saveError) {
        console.error("Failed to save deal scenarios:", saveError);
        // 저장 실패해도 결과는 반환
        result.warnings.push("결과 저장에 실패했습니다. 로컬에만 저장됩니다.");
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Deal scenarios generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}

async function saveToDatabase(
  input: z.infer<typeof DealScenarioRequestSchema>,
  result: DealScenarioOutput
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const anonToken = cookieStore.get("anon_run_token")?.value;

  const serviceClient = createServiceClient();

  // 기존 run 찾기 또는 새로 생성
  let runId = input.runId;

  if (!runId) {
    // 최근 run 찾기
    if (user) {
      const { data: existingRun } = await serviceClient
        .from("simulation_runs")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      runId = existingRun?.id;
    } else if (anonToken) {
      const { data: existingRun } = await serviceClient
        .from("simulation_runs")
        .select("id")
        .eq("anon_token", anonToken)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      runId = existingRun?.id;
    }
  }

  if (runId) {
    // 기존 run에 deal_scenarios 추가
    const { error } = await serviceClient
      .from("simulation_runs")
      .update({
        deal_scenarios_input: input,
        deal_scenarios_result: result,
        deal_scenarios_completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (error) {
      console.error("Update run error:", error);
    }
  }
}
