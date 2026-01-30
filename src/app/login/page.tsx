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
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${redirectTo}`,
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
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>이메일을 확인해주세요</CardTitle>
            <CardDescription className="text-base">
              <span className="font-medium text-foreground">{email}</span>
              로 로그인 링크를 보냈습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                이메일의 링크를 클릭하면 자동으로 로그인됩니다. 이메일이 오지
                않는다면 스팸 폴더를 확인해주세요.
              </AlertDescription>
            </Alert>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsSent(false);
                setEmail("");
              }}
            >
              다른 이메일로 시도
            </Button>

            <div className="text-center">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  홈으로 돌아가기
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">로그인</CardTitle>
          <CardDescription>
            Step 3를 진행하려면 로그인이 필요합니다.
            <br />
            이메일을 입력하시면 로그인 링크를 보내드립니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
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

          <Separator className="my-6" />

          <div className="text-center text-sm text-muted-foreground">
            <p>
              로그인하면{" "}
              <Link href="/terms" className="underline hover:text-foreground">
                이용약관
              </Link>
              과{" "}
              <Link href="/privacy" className="underline hover:text-foreground">
                개인정보처리방침
              </Link>
              에 동의하는 것으로 간주됩니다.
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                홈으로 돌아가기
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
