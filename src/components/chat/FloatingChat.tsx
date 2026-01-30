"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string }[];
}

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "안녕하세요! M&A와 기업가치 평가에 관해 궁금한 점이 있으시면 질문해 주세요.",
  timestamp: new Date(),
};

// 폴백 FAQ 응답 (API 실패 시)
const FAQ_RESPONSES: Record<string, string> = {
  "ebitda": "EBITDA는 이자, 세금, 감가상각비 차감 전 이익으로, 기업의 영업 현금흐름 창출 능력을 보여주는 지표입니다.",
  "멀티플": "EV/EBITDA 멀티플은 기업가치를 EBITDA로 나눈 값으로, 상대적 가치평가에 사용됩니다.",
  "dlom": "DLOM은 비상장 기업의 유동성 부족에 대한 할인율로, 보통 15~30% 적용됩니다.",
  "lock-in": "Lock-in은 M&A 후 창업자가 일정 기간 경영에 참여해야 하는 조건입니다.",
  "escrow": "Escrow는 거래 대금 일부를 제3자에게 예치하고 조건 충족 시 지급하는 방식입니다.",
  "earnout": "Earnout은 거래 후 목표 달성 시 추가 대금을 지급하는 조건부 대가입니다.",
};

function findFallbackResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
    if (lowerQuery.includes(keyword)) {
      return response;
    }
  }
  return "해당 질문에 대한 정보를 찾지 못했습니다. EBITDA, 멀티플, DLOM, Lock-in 등의 키워드로 질문해 주세요.";
}

export function FloatingChat() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // 스크롤 자동 이동
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // API 호출
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.answer) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.data.answer,
          timestamp: new Date(),
          sources: data.data.sources,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error("Invalid response");
      }
    } catch (error) {
      console.error("Chat error:", error);
      // 폴백 응답
      const fallbackResponse = findFallbackResponse(currentInput);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: fallbackResponse,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* 플로팅 버튼 */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-slate-800 hover:bg-slate-700 text-white",
          isOpen && "bg-slate-600"
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </Button>

      {/* 채팅 창 */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 z-50 w-80 md:w-96 shadow-2xl border-slate-200">
          <CardHeader className="pb-3 bg-slate-800 text-white rounded-t-lg">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-5 w-5" />
              M&A 도우미
              <Sparkles className="h-3 w-3 text-yellow-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* 메시지 영역 */}
            <div
              className="h-80 p-4 overflow-y-auto"
              ref={scrollRef}
            >
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-2",
                      message.role === "user" && "flex-row-reverse"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.role === "assistant"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-slate-800 text-white"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1 max-w-[75%]">
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm",
                          message.role === "assistant"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-slate-800 text-white"
                        )}
                      >
                        {message.content}
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="text-xs text-slate-400 px-1">
                          참고: {message.sources.map((s) => s.title).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="bg-slate-100 rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 입력 영역 */}
            <div className="p-3 border-t border-slate-200">
              <div className="flex gap-2">
                <Input
                  placeholder="질문을 입력하세요..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="flex-1 h-10 border-slate-200 focus:border-slate-400"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 bg-slate-800 hover:bg-slate-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                AI 기반 M&A 상담 (GPT-3.5)
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
