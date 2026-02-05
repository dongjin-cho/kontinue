import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  
  // 쿠키에서 리다이렉트 대상 읽기
  const cookieStore = await cookies();
  const authRedirectCookie = cookieStore.get("auth_redirect");
  const redirectTo = authRedirectCookie?.value 
    ? decodeURIComponent(authRedirectCookie.value) 
    : "/app/step3";

  // 유효한 경로인지 확인
  const redirectPath = redirectTo.startsWith("/") ? redirectTo : "/app/step3";

  // PKCE flow: code 파라미터 처리
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // 쿠키 삭제 및 리다이렉트
      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      response.cookies.delete("auth_redirect");
      return response;
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
      // 쿠키 삭제 및 리다이렉트
      const response = NextResponse.redirect(`${origin}${redirectPath}`);
      response.cookies.delete("auth_redirect");
      return response;
    }
    console.error("Auth token verification error:", error);
  }

  // 에러 발생 시 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
