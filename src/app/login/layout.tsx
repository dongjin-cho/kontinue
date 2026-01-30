// Force dynamic rendering for Login (requires Supabase)
export const dynamic = "force-dynamic";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
