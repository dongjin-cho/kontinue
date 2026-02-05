import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/app/step3";

  // PKCE flow: code 파라미터 처리
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 리다이렉트 대상이 유효한 경로인지 확인
      const redirectPath = next.startsWith("/") ? next : "/app/step3";
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
    console.error("Auth code exchange error:", error);
  }

  // Magic Link flow: token_hash 파라미터 처리 (구버전 호환)
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "email" | "signup" | "recovery" | "invite",
    });

    if (!error) {
      const redirectPath = next.startsWith("/") ? next : "/app/step3";
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
    console.error("Auth token verification error:", error);
  }

  // 에러 발생 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
