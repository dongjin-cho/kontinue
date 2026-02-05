import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  
  // 기본 리다이렉트 경로 - Step3로 고정
  const DEFAULT_REDIRECT = "/app/step3";

  // PKCE flow: code 파라미터 처리
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      return NextResponse.redirect(`${origin}${DEFAULT_REDIRECT}`);
    }
    console.error("Auth code exchange error:", error);
  }

  // Magic Link flow: token_hash 파라미터 처리
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "email" | "signup" | "recovery" | "invite",
    });

    if (!error) {
      return NextResponse.redirect(`${origin}${DEFAULT_REDIRECT}`);
    }
    console.error("Auth token verification error:", error);
  }

  // code나 token_hash가 없는 경우 - Supabase가 #access_token으로 보낼 수 있음
  // 이 경우 클라이언트에서 처리해야 함
  // 일단 Step3로 리다이렉트하고, Step3에서 세션 확인
  return NextResponse.redirect(`${origin}${DEFAULT_REDIRECT}`);
}
