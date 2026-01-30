import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createEmbedding, generateAnswer } from "@/lib/chat/openai";

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "메시지가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // 1. 질문을 임베딩으로 변환
    let queryEmbedding: number[];
    try {
      queryEmbedding = await createEmbedding(message);
    } catch (embeddingError) {
      console.error("Embedding error:", embeddingError);
      // 임베딩 실패 시 폴백 응답
      return NextResponse.json({
        success: true,
        data: {
          answer: "죄송합니다. 현재 AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.",
          sources: [],
        },
      });
    }

    // 2. 유사 문서 검색 (벡터 검색)
    const { data: documents, error: searchError } = await supabase.rpc(
      "match_documents",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: 3,
      }
    );

    let context: string[] = [];
    let sources: { id: string; title: string; similarity: number }[] = [];

    if (!searchError && documents && documents.length > 0) {
      context = documents.map(
        (doc: { title: string; content: string }) =>
          `[${doc.title}]\n${doc.content}`
      );
      sources = documents.map(
        (doc: { id: string; title: string; similarity: number }) => ({
          id: doc.id,
          title: doc.title,
          similarity: doc.similarity,
        })
      );
    }

    // 3. GPT로 답변 생성
    let answer: string;
    let tokensUsed = 0;

    try {
      const result = await generateAnswer(
        message,
        context,
        history?.slice(-6) || [] // 최근 3쌍의 대화만 사용
      );
      answer = result.answer;
      tokensUsed = result.tokensUsed;
    } catch (gptError) {
      console.error("GPT error:", gptError);
      // GPT 실패 시 검색된 문서 기반 간단 응답
      if (context.length > 0) {
        answer = `관련 정보를 찾았습니다:\n\n${context[0].substring(0, 500)}...`;
      } else {
        answer = "죄송합니다. 해당 질문에 대한 정보를 찾지 못했습니다. 다른 방식으로 질문해 주세요.";
      }
    }

    // 4. 메시지 저장 (세션이 있는 경우)
    if (sessionId) {
      // 사용자 메시지 저장
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role: "user",
        content: message,
      });

      // 어시스턴트 응답 저장
      await supabase.from("chat_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: answer,
        sources: sources.length > 0 ? sources : null,
        tokens_used: tokensUsed,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        answer,
        sources,
        tokensUsed,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
