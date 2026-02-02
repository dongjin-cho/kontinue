export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 개발/테스트용: RBAC 임시 비활성화
  // TODO: 프로덕션에서는 ADMIN_EMAILS 환경변수 설정 후 RBAC 활성화

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
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
              <a href="/admin/scenarios" className="hover:text-primary">
                Scenarios
              </a>
              <a href="/admin/documents" className="hover:text-primary">
                Documents
              </a>
              <a href="/admin/leads" className="hover:text-primary">
                Leads
              </a>
              <a href="/admin/knowledge" className="hover:text-primary">
                Knowledge
              </a>
              <a href="/admin/chat" className="hover:text-primary">
                Chat
              </a>
            </nav>
          </div>
          <a href="/" className="text-sm text-muted-foreground hover:text-primary">
            사이트로 돌아가기
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="container py-6 px-4">
        {children}
      </main>
    </div>
  );
}
