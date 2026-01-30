// Force dynamic rendering for Step3 (requires Supabase)
export const dynamic = "force-dynamic";

export default function Step3Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
