import OpenAI from "openai";

// OpenAI 클라이언트 (lazy initialization으로 빌드 시 에러 방지)
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * 텍스트를 임베딩 벡터로 변환
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  
  return response.data[0].embedding;
}

/**
 * 여러 텍스트를 한 번에 임베딩
 */
export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  
  return response.data.map(d => d.embedding);
}

/**
 * RAG 기반 답변 생성
 */
export async function generateAnswer(
  question: string,
  context: string[],
  conversationHistory: { role: "user" | "assistant"; content: string }[] = []
): Promise<{ answer: string; tokensUsed: number }> {
  const openai = getOpenAI();
  
  const systemPrompt = `당신은 M&A와 기업가치 평가 전문 어드바이저입니다. 
한국어로 답변하며, 전문적이면서도 이해하기 쉽게 설명합니다.
제공된 컨텍스트 정보를 기반으로 답변하되, 컨텍스트에 없는 내용은 일반적인 M&A 지식으로 보완합니다.
답변은 간결하고 핵심적으로, 필요시 예시를 들어 설명합니다.
확실하지 않은 내용은 "일반적으로" 또는 "통상적으로"라고 표현합니다.

[참고 정보]
${context.join("\n\n")}`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content: question },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  return {
    answer: response.choices[0].message.content || "답변을 생성할 수 없습니다.",
    tokensUsed: response.usage?.total_tokens || 0,
  };
}
