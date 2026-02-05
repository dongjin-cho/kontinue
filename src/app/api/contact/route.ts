import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, message, step1Result, step2Result, dealResult } = body;

    // 기본 검증
    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: "이메일 또는 전화번호가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // contact_requests 테이블에 저장
    const { data, error } = await supabase
      .from("contact_requests")
      .insert({
        name: name || null,
        email: email || null,
        phone: phone || null,
        message: message || null,
        step1_result: step1Result ? JSON.parse(step1Result) : null,
        step2_result: step2Result ? JSON.parse(step2Result) : null,
        deal_result: dealResult ? JSON.parse(dealResult) : null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Contact save error:", error);
      // 테이블이 없는 경우에도 성공 응답 (테이블 생성 전까지)
      if (error.code === "42P01") {
        console.warn("contact_requests table does not exist yet");
        return NextResponse.json({ success: true, data: null });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Contact API error:", error);
    return NextResponse.json(
      { success: false, error: "제출 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
