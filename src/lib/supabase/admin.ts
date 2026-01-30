import { createClient } from "@supabase/supabase-js";

/**
 * Admin용 Supabase 클라이언트 (Service Role)
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Admin 이메일 목록 확인
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) || [];
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Admin 권한 체크 (서버용)
 */
export async function checkAdminAuth(
  userEmail: string | null | undefined
): Promise<{ isAdmin: boolean; error?: string }> {
  if (!userEmail) {
    return { isAdmin: false, error: "Not authenticated" };
  }

  if (!isAdminEmail(userEmail)) {
    return { isAdmin: false, error: "Not authorized" };
  }

  return { isAdmin: true };
}
