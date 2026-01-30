import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ExtractedFinancials } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  try {
    const { documentId, verified } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "documentId is required" },
        { status: 400 }
      );
    }

    if (!verified || typeof verified !== "object") {
      return NextResponse.json(
        { success: false, error: "verified data is required" },
        { status: 400 }
      );
    }

    // 사용자 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 문서 조회 (RLS로 자신의 문서만)
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, status")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // parsed 상태인 경우만 verify 가능
    if (document.status !== "parsed") {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot verify document with status: ${document.status}`,
        },
        { status: 400 }
      );
    }

    // 검증된 데이터 정제
    const verifiedData: ExtractedFinancials = {
      revenue: verified.revenue ? Number(verified.revenue) : undefined,
      gross_profit: verified.gross_profit
        ? Number(verified.gross_profit)
        : undefined,
      operating_income: verified.operating_income
        ? Number(verified.operating_income)
        : undefined,
      ebitda: verified.ebitda ? Number(verified.ebitda) : undefined,
      net_income: verified.net_income ? Number(verified.net_income) : undefined,
      assets: verified.assets ? Number(verified.assets) : undefined,
      liabilities: verified.liabilities
        ? Number(verified.liabilities)
        : undefined,
      cash: verified.cash ? Number(verified.cash) : undefined,
      total_debt: verified.total_debt ? Number(verified.total_debt) : undefined,
      fiscal_year: verified.fiscal_year
        ? Number(verified.fiscal_year)
        : undefined,
      currency: verified.currency || "KRW",
    };

    // 문서 업데이트
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        verified_json: verifiedData,
        status: "verified",
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Failed to update document:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update document" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document verified successfully",
      documentId,
    });
  } catch (error) {
    console.error("Verify API error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
