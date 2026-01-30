import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createEmbedding } from "@/lib/chat/openai";

// 문서 추가
export async function POST(request: NextRequest) {
  try {
    const { title, content, category } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "제목과 내용이 필요합니다." },
        { status: 400 }
      );
    }

    // 임베딩 생성
    let embedding: number[];
    try {
      embedding = await createEmbedding(`${title}\n${content}`);
    } catch (embeddingError) {
      console.error("Embedding error:", embeddingError);
      return NextResponse.json(
        { success: false, error: "임베딩 생성에 실패했습니다. OpenAI API 키를 확인하세요." },
        { status: 500 }
      );
    }

    // Supabase에 저장
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("knowledge_documents")
      .insert({
        title,
        content,
        category: category || "general",
        embedding,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId: data.id,
      message: "문서가 추가되었습니다.",
    });
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 문서 삭제
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("id");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "문서 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("knowledge_documents")
      .delete()
      .eq("id", documentId);

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "문서가 삭제되었습니다.",
    });
  } catch (error) {
    console.error("Knowledge API error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
