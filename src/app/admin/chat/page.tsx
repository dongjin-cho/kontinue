import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, User, Bot, Calendar, Hash } from "lucide-react";

interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  tokens_used?: number;
  sources?: { title: string }[];
}

interface ChatSession {
  id: string;
  user_id?: string;
  anon_token?: string;
  title?: string;
  created_at: string;
  messages: ChatMessage[];
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(date);
}

export default async function AdminChatPage() {
  const supabase = createServiceClient();

  // 최근 메시지 가져오기 (세션별로 그룹화하지 않고 시간순 정렬)
  const { data: messages, error } = await supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to fetch chat messages:", error);
  }

  // 세션별로 그룹화
  const sessionMap = new Map<string, ChatMessage[]>();
  (messages || []).forEach((msg) => {
    const sessionId = msg.session_id || "anonymous";
    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, []);
    }
    sessionMap.get(sessionId)!.push(msg);
  });

  // 세션 목록 (최신순)
  const sessions = Array.from(sessionMap.entries())
    .map(([sessionId, msgs]) => ({
      id: sessionId,
      messages: msgs.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ),
      lastMessage: msgs[0],
      messageCount: msgs.length,
    }))
    .sort((a, b) => 
      new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
    );

  // 통계
  const totalMessages = messages?.length || 0;
  const userMessages = messages?.filter((m) => m.role === "user").length || 0;
  const totalTokens = messages?.reduce((sum, m) => sum + (m.tokens_used || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">챗봇 대화 내역</h1>
        <p className="text-muted-foreground">사용자들의 챗봇 대화를 확인합니다.</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 세션</CardDescription>
            <CardTitle className="text-2xl">{sessions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 메시지</CardDescription>
            <CardTitle className="text-2xl">{totalMessages}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>사용자 질문</CardDescription>
            <CardTitle className="text-2xl">{userMessages}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>총 토큰 사용</CardDescription>
            <CardTitle className="text-2xl">{totalTokens.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 세션 목록 */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">최근 대화 세션</h2>
        
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              아직 챗봇 대화 내역이 없습니다.
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-mono">
                      {session.id.slice(0, 8)}...
                    </CardTitle>
                    <Badge variant="secondary">
                      <Hash className="h-3 w-3 mr-1" />
                      {session.messageCount}개 메시지
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(session.lastMessage.created_at)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {session.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "user" ? (
                          <User className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        {msg.tokens_used && (
                          <p className="text-xs opacity-70 mt-1">
                            {msg.tokens_used} tokens
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
