import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: "documentId is required" },
        { status: 400 }
      );
    }

    // 사용자 인증 확인
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 문서 조회 (RLS로 자신의 문서만 조회 가능)
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { success: false, error: "Document not found" },
        { status: 404 }
      );
    }

    // 이미 파싱 중이거나 완료된 경우 체크
    if (document.status === "parsing") {
      return NextResponse.json(
        { success: false, error: "Document is already being parsed" },
        { status: 400 }
      );
    }

    if (document.status === "parsed" || document.status === "verified") {
      return NextResponse.json(
        { success: false, error: "Document is already parsed" },
        { status: 400 }
      );
    }

    // Service client로 문서 상태 업데이트
    const serviceClient = createServiceClient();

    // Signed URL 생성 (10분 TTL)
    const { data: signedUrlData, error: signedUrlError } =
      await serviceClient.storage
        .from("documents")
        .createSignedUrl(document.file_path, 600); // 10분

    if (signedUrlError || !signedUrlData?.signedUrl) {
      // 상태를 failed로 업데이트
      await serviceClient
        .from("documents")
        .update({
          status: "failed",
          error_message: "Failed to generate signed URL",
        })
        .eq("id", documentId);

      return NextResponse.json(
        { success: false, error: "Failed to generate signed URL" },
        { status: 500 }
      );
    }

    // 상태를 parsing으로 업데이트
    await serviceClient
      .from("documents")
      .update({ status: "parsing", error_message: null })
      .eq("id", documentId);

    // MAKE_WEBHOOK_URL로 파싱 요청
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

    if (!makeWebhookUrl) {
      // 웹훅 URL이 없으면 상태를 failed로
      await serviceClient
        .from("documents")
        .update({
          status: "failed",
          error_message: "MAKE_WEBHOOK_URL not configured",
        })
        .eq("id", documentId);

      return NextResponse.json(
        { success: false, error: "Parsing service not configured" },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/api/webhook/document-parsed`;

    const webhookPayload = {
      documentId: document.id,
      userId: user.id,
      filePath: document.file_path,
      signedUrl: signedUrlData.signedUrl,
      fileName: document.file_name,
      mimeType: document.mime_type,
      callbackUrl,
    };

    try {
      const webhookResponse = await fetch(makeWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookPayload),
      });

      if (!webhookResponse.ok) {
        throw new Error(`Webhook returned ${webhookResponse.status}`);
      }

      return NextResponse.json({
        success: true,
        message: "Parsing request sent",
        documentId,
      });
    } catch (webhookError) {
      // 웹훅 요청 실패
      await serviceClient
        .from("documents")
        .update({
          status: "failed",
          error_message: `Webhook request failed: ${webhookError instanceof Error ? webhookError.message : "Unknown error"}`,
        })
        .eq("id", documentId);

      return NextResponse.json(
        { success: false, error: "Failed to send parsing request" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Parse API error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
