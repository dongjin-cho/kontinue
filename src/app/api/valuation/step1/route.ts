import { NextRequest, NextResponse } from "next/server";
import { Step1InputSchema } from "@/lib/valuation/types";
import { calculateStep1Valuation } from "@/lib/valuation/step1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Zod 검증
    const parseResult = Step1InputSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      
      return NextResponse.json(
        {
          success: false,
          errors,
        },
        { status: 400 }
      );
    }
    
    // 평가 실행
    const result = calculateStep1Valuation(parseResult.data);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Valuation API error:", error);
    
    return NextResponse.json(
      {
        success: false,
        errors: [{ field: "general", message: "서버 오류가 발생했습니다." }],
      },
      { status: 500 }
    );
  }
}
