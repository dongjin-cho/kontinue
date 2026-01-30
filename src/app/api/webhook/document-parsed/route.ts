import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { mapExternalParserResponse } from "@/lib/supabase/webhook-mapper";
import { createNormalizedSummary, type ExtractedFinancialData } from "@/lib/supabase/financial-schema";

export async function POST(request: NextRequest) {
  try {
    // (선택) 웹훅 시크릿 검증
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");

      if (providedSecret !== webhookSecret) {
        console.warn("Webhook: Invalid secret");
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const payload = await request.json();
    const { documentId, status, extracted, error } = payload;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "documentId is required" },
        { status: 400 }
      );
    }

    if (!status || !["parsed", "failed"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    if (status === "parsed") {
      // 문서 정보 조회 (파일명 등)
      const { data: docInfo } = await serviceClient
        .from("documents")
        .select("file_name")
        .eq("id", documentId)
        .single();

      // 외부 파서 응답을 kr-fin-v1 스키마로 매핑
      const { data: mappedData, warnings } = mapExternalParserResponse(
        extracted || {},
        docInfo?.file_name
      );

      // 기본 기간 선택 (첫 번째 기간)
      const selectedPeriodId = mappedData.periods[0]?.period_id || null;

      // 정규화된 요약 생성
      let normalizedSummary = null;
      if (selectedPeriodId) {
        normalizedSummary = createNormalizedSummary(mappedData, selectedPeriodId);
      }

      // 문서 업데이트
      const { error: updateError } = await serviceClient
        .from("documents")
        .update({
          status: "parsed",
          schema_version: "kr-fin-v1",
          extracted_json: mappedData,
          selected_period_id: selectedPeriodId,
          normalized_summary: normalizedSummary,
          error_message: warnings.length > 0 ? warnings.join("; ") : null,
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Failed to update document:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update document" },
          { status: 500 }
        );
      }

      console.log(`Document ${documentId} parsed successfully. Warnings: ${warnings.length}`);
    } else {
      // 파싱 실패
      const { error: updateError } = await serviceClient
        .from("documents")
        .update({
          status: "failed",
          error_message: error || "Parsing failed",
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("Failed to update document:", updateError);
        return NextResponse.json(
          { success: false, error: "Failed to update document" },
          { status: 500 }
        );
      }

      console.log(`Document ${documentId} parsing failed: ${error}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
