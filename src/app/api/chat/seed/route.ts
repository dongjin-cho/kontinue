import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createEmbeddings } from "@/lib/chat/openai";
import { KNOWLEDGE_BASE } from "@/lib/chat/knowledge-base";

// 지식 베이스 시드 API (관리자 전용)
export async function POST(request: NextRequest) {
  try {
    // 간단한 인증 (실제로는 더 강화 필요)
    const authHeader = request.headers.get("authorization");
    const adminKey = process.env.ADMIN_SEED_KEY || "kontinue-admin-seed-2026";
    
    if (authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // 기존 문서 확인
    const { count } = await supabase
      .from("knowledge_documents")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return NextResponse.json({
        success: false,
        error: "Knowledge base already seeded",
        count,
      });
    }

    // 모든 문서의 임베딩 생성 (배치로 처리)
    const texts = KNOWLEDGE_BASE.map((doc) => `${doc.title}\n${doc.content}`);
    
    console.log(`Creating embeddings for ${texts.length} documents...`);
    const embeddings = await createEmbeddings(texts);

    // Supabase에 저장
    const documents = KNOWLEDGE_BASE.map((doc, index) => ({
      title: doc.title,
      content: doc.content,
      category: doc.category,
      embedding: embeddings[index],
    }));

    const { error: insertError } = await supabase
      .from("knowledge_documents")
      .insert(documents);

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${documents.length} documents`,
      count: documents.length,
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
