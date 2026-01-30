import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  if (!isAdminEmail(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">접근 권한 없음</h1>
          <p className="text-muted-foreground">
            관리자 권한이 필요합니다. ({user.email})
          </p>
          <a href="/" className="text-primary underline">
            홈으로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/admin" className="font-bold text-lg">
              Kontinue Admin
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/admin" className="hover:text-primary">
                Dashboard
              </a>
              <a href="/admin/runs" className="hover:text-primary">
                Runs
              </a>
              <a href="/admin/documents" className="hover:text-primary">
                Documents
              </a>
              <a href="/admin/leads" className="hover:text-primary">
                Leads
              </a>
            </nav>
          </div>
          <div className="text-sm text-muted-foreground">
            {user.email}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}
