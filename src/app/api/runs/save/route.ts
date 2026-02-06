import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const ANON_TOKEN_COOKIE = "anon_run_token";

export async function POST(request: NextRequest) {
  console.log("[runs/save] API called");
  
  try {
    const body = await request.json();
    const { step, input, result } = body;
    
    console.log("[runs/save] Step:", step);

    if (!step || !["step1", "step2", "step2_cashflow", "step2_deal_scenarios"].includes(step)) {
      console.log("[runs/save] Invalid step");
      return NextResponse.json(
        { success: false, error: "Invalid step" },
        { status: 400 }
      );
    }

    // Service role key 확인
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[runs/save] SUPABASE_SERVICE_ROLE_KEY is not set!");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    // 사용자 확인 (로그인 또는 게스트)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    console.log("[runs/save] User:", user?.id || "anonymous");

    // anon_token 가져오기 또는 생성
    const cookieStore = await cookies();
    let anonToken = cookieStore.get(ANON_TOKEN_COOKIE)?.value;

    // Service client로 저장 (RLS 우회)
    const serviceClient = createServiceClient();

    let runId: string | null = null;

    if (user) {
      // 로그인 사용자: user_id로 최신 run 찾기
      const { data: existingRun } = await serviceClient
        .from("simulation_runs")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingRun && step === "step2") {
        runId = existingRun.id;
      }
    } else if (anonToken) {
      // 게스트: anon_token으로 run 찾기
      const { data: existingRun } = await serviceClient
        .from("simulation_runs")
        .select("id")
        .eq("anon_token", anonToken)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (existingRun) {
        runId = existingRun.id;
      }
    }

    // Step1이면 새 run 생성, Step2면 기존 run 업데이트
    if (step === "step1" || !runId) {
      // 새 run 생성
      if (!anonToken && !user) {
        anonToken = uuidv4();
      }

      const newRun = {
        user_id: user?.id || null,
        anon_token: user ? null : anonToken,
        step1_input: input,
        step1_result: result,
        step1_completed_at: new Date().toISOString(),
        industry_group: result?.industryGroup || null,
        company_name: input?.companyName || null,
      };

      console.log("[runs/save] Inserting new run:", JSON.stringify(newRun, null, 2));
      
      const { data: insertedRun, error: insertError } = await serviceClient
        .from("simulation_runs")
        .insert(newRun)
        .select("id")
        .single();

      if (insertError) {
        console.error("[runs/save] Failed to insert run:", insertError);
        console.error("[runs/save] Error details:", JSON.stringify(insertError, null, 2));
        return NextResponse.json(
          { success: false, error: "Failed to save run", details: insertError.message },
          { status: 500 }
        );
      }
      
      console.log("[runs/save] Successfully inserted run:", insertedRun?.id);

      runId = insertedRun.id;

      // 게스트면 쿠키 설정
      const response = NextResponse.json({
        success: true,
        runId,
        message: "Step1 saved",
      });

      if (!user && anonToken) {
        response.cookies.set(ANON_TOKEN_COOKIE, anonToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30일
          path: "/",
        });
      }

      return response;
    } else {
      // Step2 또는 하위 단계: 기존 run 업데이트
      let updateData: Record<string, unknown> = {};

      if (step === "step2" || step === "step2_cashflow") {
        // 현금흐름 분석 저장
        updateData = {
          step2_input: input,
          step2_result: result,
          step2_completed_at: new Date().toISOString(),
        };
      } else if (step === "step2_deal_scenarios") {
        // 딜 구조 시나리오 저장
        updateData = {
          deal_scenarios_input: input,
          deal_scenarios_result: result,
          deal_scenarios_completed_at: new Date().toISOString(),
        };
      }

      const { error: updateError } = await serviceClient
        .from("simulation_runs")
        .update(updateData)
        .eq("id", runId);

      if (updateError) {
        console.error("Failed to update run:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update run" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        runId,
        message: `${step} saved`,
      });
    }
  } catch (error) {
    console.error("[runs/save] Unexpected error:", error);
    return NextResponse.json(
      { success: false, error: "Server error", details: String(error) },
      { status: 500 }
    );
  }
}
