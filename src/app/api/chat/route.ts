import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// FAQ 기반 폴백 응답
const FAQ_RESPONSES: Record<string, string> = {
  "ebitda": "EBITDA(Earnings Before Interest, Taxes, Depreciation, and Amortization)는 이자, 세금, 감가상각비 차감 전 이익입니다. 기업의 영업 현금흐름 창출 능력을 보여주는 핵심 지표로, M&A에서 기업가치 산정의 기준이 됩니다.",
  "멀티플": "EV/EBITDA 멀티플은 기업가치(EV)를 EBITDA로 나눈 배수입니다. 동종 업계 거래 사례와 비교하여 적정 기업가치를 산출하는 상대가치평가법에 사용됩니다. 업종별로 일반적인 멀티플 범위가 다릅니다.",
  "배수": "EV/EBITDA 멀티플은 기업가치(EV)를 EBITDA로 나눈 배수입니다. 동종 업계 거래 사례와 비교하여 적정 기업가치를 산출하는 상대가치평가법에 사용됩니다.",
  "dlom": "DLOM(Discount for Lack of Marketability)은 비상장 기업의 유동성 부족에 대한 할인율입니다. 상장 기업과 달리 즉시 매각이 어려운 점을 반영하여 보통 15~30% 수준을 적용합니다.",
  "유동성": "비상장 기업은 상장 기업 대비 유동성이 낮아 DLOM(Discount for Lack of Marketability)을 적용합니다. 보통 15~30% 수준의 할인율이 적용됩니다.",
  "lock-in": "Lock-in은 M&A 거래 후 창업자(매도자)가 일정 기간 회사 경영에 참여해야 하는 조건입니다. 보통 1~3년이며, 인수자가 경영 안정성과 지식 이전을 확보하기 위한 장치입니다.",
  "락인": "Lock-in은 M&A 거래 후 창업자(매도자)가 일정 기간 회사 경영에 참여해야 하는 조건입니다. 보통 1~3년이며, 인수자가 경영 안정성과 지식 이전을 확보하기 위한 장치입니다.",
  "escrow": "Escrow(에스크로)는 거래 대금의 일부를 제3자(보통 은행)에게 예치하고, 약정 조건 충족 시 지급하는 방식입니다. 진술 및 보장 위반에 대비한 안전장치입니다.",
  "에스크로": "Escrow(에스크로)는 거래 대금의 일부를 제3자(보통 은행)에게 예치하고, 약정 조건 충족 시 지급하는 방식입니다. 진술 및 보장 위반에 대비한 안전장치입니다.",
  "earnout": "Earnout(언아웃)은 거래 후 일정 기간 내 목표 달성 시 추가 대금을 지급하는 조건부 대가입니다. 매수자와 매도자 간 기업가치에 대한 시각 차이를 조율하는 데 활용됩니다.",
  "언아웃": "Earnout(언아웃)은 거래 후 일정 기간 내 목표 달성 시 추가 대금을 지급하는 조건부 대가입니다. 매수자와 매도자 간 기업가치에 대한 시각 차이를 조율하는 데 활용됩니다.",
  "기업가치": "기업가치(Enterprise Value, EV)는 주주가치와 순차입금을 합한 값입니다. M&A에서는 EBITDA에 적정 멀티플을 곱하여 산정하고, 비상장 기업의 경우 DLOM 등 할인 요소를 적용합니다.",
  "지분가치": "지분가치(Equity Value)는 기업가치에서 순차입금을 차감한 주주 귀속 가치입니다. 최종적으로 매도자가 받게 되는 금액의 기준이 됩니다.",
  "듀딜리전스": "실사(Due Diligence)는 M&A 전 대상 기업의 재무, 법률, 세무, 사업 등을 종합적으로 검토하는 과정입니다. 잠재적 리스크를 파악하고 거래 조건을 조정하는 데 활용됩니다.",
  "실사": "실사(Due Diligence)는 M&A 전 대상 기업의 재무, 법률, 세무, 사업 등을 종합적으로 검토하는 과정입니다. 잠재적 리스크를 파악하고 거래 조건을 조정하는 데 활용됩니다.",
};

function findFallbackResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
    if (lowerQuery.includes(keyword)) {
      return response;
    }
  }
  return "M&A와 기업가치 평가에 관한 구체적인 질문을 해주시면 더 정확한 답변을 드릴 수 있습니다. 예: EBITDA, 멀티플, DLOM, Lock-in, Escrow, Earnout 등";
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, history } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "메시지가 필요합니다." },
        { status: 400 }
      );
    }

    // OpenAI API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      console.log("OPENAI_API_KEY not configured, using fallback responses");
      return NextResponse.json({
        success: true,
        data: {
          answer: findFallbackResponse(message),
          sources: [],
        },
      });
    }

    // 동적 임포트로 OpenAI 모듈 로드 (API 키가 있을 때만)
    const { createEmbedding, generateAnswer } = await import("@/lib/chat/openai");
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
          answer: findFallbackResponse(message),
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
        answer = findFallbackResponse(message);
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
