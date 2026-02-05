"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  Mail,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/app/step3";

  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSent, setIsSent] = React.useState(false);

  // 이미 로그인된 경우 리다이렉트
  React.useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        router.push(redirectTo);
      }
    };

    checkSession();
  }, [supabase, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 쿠키에 리다이렉트 대상 저장 (Magic Link 클릭 후 callback에서 사용)
      document.cookie = `auth_redirect=${encodeURIComponent(redirectTo)}; path=/; max-age=3600; SameSite=Lax`;
      
      // auth/callback으로 리다이렉트
      const callbackUrl = `${window.location.origin}/auth/callback`;
      
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (signInError) {
        throw signInError;
      }

      setIsSent(true);
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "로그인 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 이메일 전송 완료 화면
  if (isSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-slate-800">이메일을 확인해 주십시오</CardTitle>
            <CardDescription className="text-base text-slate-600">
              <span className="font-medium text-slate-800">{email}</span>
              로 로그인 링크를 발송했습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-slate-200 bg-slate-50">
              <Mail className="h-4 w-4 text-slate-600" />
              <AlertDescription className="text-slate-600">
                이메일의 링크를 클릭하시면 자동으로 재무제표 분석 화면으로 이동합니다.
                이메일이 도착하지 않는 경우 스팸 폴더를 확인해 주십시오.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              className="w-full border-slate-300"
              onClick={() => {
                setIsSent(false);
                setEmail("");
              }}
            >
              다른 이메일로 시도
            </Button>

            <div className="text-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  처음으로 돌아가기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-slate-800">본인 확인</CardTitle>
          <CardDescription className="text-slate-500">
            재무제표 분석을 위해 이메일 인증이 필요합니다.
            <br />
            이메일 주소를 입력해 주시면 로그인 링크를 보내드리겠습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="pl-10 border-slate-200 focus:border-slate-400"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700"
              size="lg"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  전송 중...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  로그인 링크 받기
                </>
              )}
            </Button>
          </form>

          <Separator className="my-6 bg-slate-200" />

          <div className="text-center text-sm text-slate-400">
            <p>
              로그인하시면{" "}
              <Link href="/terms" className="underline hover:text-slate-600">
                이용약관
              </Link>
              과{" "}
              <Link href="/privacy" className="underline hover:text-slate-600">
                개인정보처리방침
              </Link>
              에 동의하는 것으로 간주됩니다.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                처음으로 돌아가기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginContent />
    </React.Suspense>
  );
}
