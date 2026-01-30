import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import type { LeadSubmitRequest, BrokerWebhookPayload } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  try {
    const body: LeadSubmitRequest = await request.json();

    const { documentId, consent, contact, step1, step2 } = body;

    // 동의 체크 필수
    if (!consent) {
      return NextResponse.json(
        { success: false, error: "동의가 필요합니다" },
        { status: 400 }
      );
    }

    // 연락처 필수 필드 확인
    if (!contact?.name || !contact?.email) {
      return NextResponse.json(
        { success: false, error: "이름과 이메일은 필수입니다" },
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

    // 문서 정보 조회 (있는 경우)
    let financialSummary = null;
    let documentSignedUrl = null;

    if (documentId) {
      const { data: document } = await supabase
        .from("documents")
        .select("verified_json, extracted_json, file_path")
        .eq("id", documentId)
        .single();

      if (document) {
        // verified_json 우선, 없으면 extracted_json
        financialSummary = document.verified_json || document.extracted_json;

        // 문서 Signed URL 생성 (30분 TTL)
        const serviceClient = createServiceClient();
        const { data: signedUrlData } = await serviceClient.storage
          .from("documents")
          .createSignedUrl(document.file_path, 1800);

        documentSignedUrl = signedUrlData?.signedUrl;
      }
    }

    // Step1/Step2 요약 추출 (타입 캐스팅)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s1 = step1 as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s2 = step2 as any;

    const step1Summary = s1
      ? {
          industryGroup: s1.industryGroup,
          equityValueLow: s1.equityValue?.low,
          equityValueHigh: s1.equityValue?.high,
          enterpriseValueLow: s1.enterpriseValue?.rangeLow,
          enterpriseValueHigh: s1.enterpriseValue?.rangeHigh,
          multipleMedian: s1.multiples?.finalMedian,
        }
      : null;

    const step2Summary = s2
      ? {
          lockInYears: s2.basis?.lockInYears,
          // 100% 시나리오 또는 마지막 시나리오
          selectedScenario:
            s2.scenarios?.find(
              (sc: { equityPct: number }) => sc.equityPct === 100
            ) || s2.scenarios?.[s2.scenarios.length - 1],
        }
      : null;

    // 브로커 페이로드 구성
    const brokerPayload: BrokerWebhookPayload = {
      leadId: "", // 생성 후 업데이트
      contact: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        message: contact.message,
      },
      valuationSummary: step1Summary || undefined,
      simulationSummary: step2Summary
        ? {
            lockInYears: step2Summary.lockInYears,
            selectedEquityPct: step2Summary.selectedScenario?.equityPct,
            totalProceeds: step2Summary.selectedScenario?.totalProceeds,
            presentValue: step2Summary.selectedScenario?.pv,
          }
        : undefined,
      financialSummary: financialSummary || undefined,
      documentUrl: documentSignedUrl || undefined,
      createdAt: new Date().toISOString(),
    };

    // 리드 생성
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        user_id: user.id,
        document_id: documentId || null,
        contact_name: contact.name,
        contact_email: contact.email,
        contact_phone: contact.phone || null,
        contact_message: contact.message || null,
        consent_given: true,
        consent_given_at: new Date().toISOString(),
        step1_summary: step1 || null,
        step2_summary: step2 || null,
        financial_summary: financialSummary,
        broker_payload: brokerPayload,
        sent_status: "pending",
      })
      .select("id")
      .single();

    if (leadError || !lead) {
      console.error("Failed to create lead:", leadError);
      return NextResponse.json(
        { success: false, error: "Failed to create lead" },
        { status: 500 }
      );
    }

    // 브로커 페이로드에 leadId 추가
    brokerPayload.leadId = lead.id;

    // 브로커 웹훅 전송 (설정된 경우)
    const brokerWebhookUrl = process.env.BROKER_WEBHOOK_URL;

    if (brokerWebhookUrl) {
      try {
        const webhookResponse = await fetch(brokerWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(brokerPayload),
        });

        if (webhookResponse.ok) {
          // 전송 성공
          await supabase
            .from("leads")
            .update({
              broker_payload: brokerPayload,
              sent_status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", lead.id);
        } else {
          // 전송 실패
          await supabase
            .from("leads")
            .update({
              broker_payload: brokerPayload,
              sent_status: "failed",
              send_error: `Webhook returned ${webhookResponse.status}`,
            })
            .eq("id", lead.id);
        }
      } catch (webhookError) {
        // 전송 오류
        await supabase
          .from("leads")
          .update({
            broker_payload: brokerPayload,
            sent_status: "failed",
            send_error:
              webhookError instanceof Error
                ? webhookError.message
                : "Unknown error",
          })
          .eq("id", lead.id);
      }
    } else {
      // 브로커 URL 없으면 저장만
      await supabase
        .from("leads")
        .update({
          broker_payload: brokerPayload,
        })
        .eq("id", lead.id);
    }

    return NextResponse.json({
      success: true,
      message: "Lead submitted successfully",
      leadId: lead.id,
    });
  } catch (error) {
    console.error("Lead submit error:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
