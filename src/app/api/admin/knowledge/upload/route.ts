import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createEmbedding } from "@/lib/chat/openai";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CONTENT_LENGTH = 8000; // 임베딩 최대 길이

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "파일이 필요합니다." },
        { status: 400 }
      );
    }

    // 파일 크기 확인
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "파일 크기가 10MB를 초과합니다." },
        { status: 400 }
      );
    }

    // 파일 타입 확인
    const allowedTypes = ["text/plain", "text/markdown"];
    const allowedExtensions = [".txt", ".md"];
    const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        { success: false, error: "지원하지 않는 파일 형식입니다. (.txt, .md만 가능)" },
        { status: 400 }
      );
    }

    // 파일 내용 읽기
    const content = await file.text();
    
    if (!content.trim()) {
      return NextResponse.json(
        { success: false, error: "파일 내용이 비어있습니다." },
        { status: 400 }
      );
    }

    // 파일명에서 제목 추출 (확장자 제외)
    const title = file.name.replace(/\.[^/.]+$/, "");

    // 내용이 너무 길면 청크로 분할
    const chunks = splitIntoChunks(content, MAX_CONTENT_LENGTH);
    const supabase = createServiceClient();
    const insertedIds: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkTitle = chunks.length > 1 ? `${title} (${i + 1}/${chunks.length})` : title;

      // 임베딩 생성
      let embedding: number[];
      try {
        embedding = await createEmbedding(`${chunkTitle}\n${chunk}`);
      } catch (embeddingError) {
        console.error("Embedding error:", embeddingError);
        return NextResponse.json(
          { success: false, error: "임베딩 생성에 실패했습니다." },
          { status: 500 }
        );
      }

      // Supabase에 저장
      const { data, error } = await supabase
        .from("knowledge_documents")
        .insert({
          title: chunkTitle,
          content: chunk,
          category,
          embedding,
          metadata: {
            source_file: file.name,
            chunk_index: i,
            total_chunks: chunks.length,
          },
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

      insertedIds.push(data.id);
    }

    return NextResponse.json({
      success: true,
      documentIds: insertedIds,
      chunks: chunks.length,
      message: `${chunks.length}개의 문서가 추가되었습니다.`,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { success: false, error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

// 긴 텍스트를 청크로 분할
function splitIntoChunks(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 <= maxLength) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      
      // 단락 자체가 너무 길면 문장 단위로 분할
      if (paragraph.length > maxLength) {
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        currentChunk = "";
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxLength) {
            currentChunk += (currentChunk ? " " : "") + sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
