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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: "안녕하세요! 기업가치 평가와 M&A 관련 궁금한 점이 있으시면 질문해 주세요.",
  timestamp: new Date(),
};

// 간단한 FAQ 응답 (실제 서비스에서는 AI API 연동)
const FAQ_RESPONSES: Record<string, string> = {
  "ebitda": "EBITDA는 'Earnings Before Interest, Taxes, Depreciation, and Amortization'의 약자로, 이자, 세금, 감가상각비 차감 전 이익을 의미합니다. 기업의 영업 현금흐름 창출 능력을 보여주는 지표입니다.",
  "멀티플": "EV/EBITDA 멀티플은 기업가치(EV)를 EBITDA로 나눈 값으로, 동종 업계 기업들과 비교하여 상대적 가치를 평가하는 데 사용됩니다. 멀티플이 높을수록 시장에서 높게 평가받고 있다는 의미입니다.",
  "dlom": "DLOM(Discount for Lack of Marketability)은 비상장 기업의 유동성 부족에 대한 할인율입니다. 상장기업 대비 주식을 쉽게 매도할 수 없는 점을 반영하여 15~30% 정도 할인을 적용합니다.",
  "lock-in": "Lock-in 기간은 M&A 거래 후 창업자/경영진이 일정 기간 회사에 남아 경영에 참여해야 하는 조건입니다. 일반적으로 1~5년 정도이며, 이 기간 동안 일부 대금이 유보될 수 있습니다.",
  "escrow": "Escrow는 거래 대금의 일부를 제3자(에스크로 에이전트)에게 예치해두고, 일정 조건 충족 시 지급하는 방식입니다. 주로 진술 및 보증 위반에 대비한 안전장치로 활용됩니다.",
  "earnout": "Earnout은 거래 후 일정 목표(매출, 이익 등)를 달성하면 추가 대금을 지급하는 조건부 대가입니다. 매수자와 매도자 간 가치평가 차이를 줄이는 데 활용됩니다.",
  "기업가치": "기업가치(Enterprise Value, EV)는 기업 전체의 가치로, 지분가치(Equity Value)에 순차입금을 더한 값입니다. 인수자 관점에서 기업을 인수하기 위해 필요한 총 비용을 나타냅니다.",
  "지분가치": "지분가치(Equity Value)는 주주에게 귀속되는 가치로, 기업가치(EV)에서 순차입금을 차감한 금액입니다. M&A에서 매도자가 실제로 받게 되는 금액의 기준이 됩니다.",
};

function findResponse(query: string): string {
  const lowerQuery = query.toLowerCase();
  
  for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
    if (lowerQuery.includes(keyword)) {
      return response;
    }
  }
  
  return "해당 질문에 대한 정보를 찾지 못했습니다. 다른 방식으로 질문해 주시거나, 기업가치, EBITDA, 멀티플, DLOM, Lock-in, Escrow, Earnout 등의 키워드로 질문해 주세요.";
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
    setInput("");
    setIsLoading(true);

    // 응답 생성 (시뮬레이션)
    setTimeout(() => {
      const response = findResponse(userMessage.content);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 500);
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
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 max-w-[75%] text-sm",
                        message.role === "assistant"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-800 text-white"
                      )}
                    >
                      {message.content}
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
                EBITDA, 멀티플, Lock-in 등 키워드로 질문해 보세요
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
