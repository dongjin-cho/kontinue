import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminEmail } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type || !["runs", "leads", "documents"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    let data: Record<string, unknown>[] = [];
    let headers: string[] = [];

    switch (type) {
      case "runs":
        const { data: runs } = await adminClient
          .from("simulation_runs")
          .select("id, user_id, industry_group, company_name, step1_completed_at, step2_completed_at, step3_completed_at, created_at")
          .order("created_at", { ascending: false });
        
        data = runs || [];
        headers = ["id", "user_id", "industry_group", "company_name", "step1_completed_at", "step2_completed_at", "step3_completed_at", "created_at"];
        break;

      case "leads":
        const { data: leads } = await adminClient
          .from("leads")
          .select("id, contact_name, contact_email, contact_phone, sent_status, sent_at, consent_given, created_at")
          .order("created_at", { ascending: false });
        
        data = leads || [];
        headers = ["id", "contact_name", "contact_email", "contact_phone", "sent_status", "sent_at", "consent_given", "created_at"];
        break;

      case "documents":
        const { data: docs } = await adminClient
          .from("documents")
          .select("id, file_name, mime_type, status, selected_period_id, schema_version, created_at")
          .order("created_at", { ascending: false });
        
        data = docs || [];
        headers = ["id", "file_name", "mime_type", "status", "selected_period_id", "schema_version", "created_at"];
        break;
    }

    // CSV 생성
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((h) => {
            const value = row[h];
            if (value === null || value === undefined) return "";
            const str = String(value);
            // 특수문자 이스케이프
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(",")
      ),
    ];

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
