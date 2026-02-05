"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-L67K68ERF1";

// UTM 파라미터 인터페이스
interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

// UTM 파라미터 추적 컴포넌트
function UTMTracker() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !window.gtag) return;

    // UTM 파라미터 추출
    const utmParams: UTMParams = {
      utm_source: searchParams.get("utm_source") || undefined,
      utm_medium: searchParams.get("utm_medium") || undefined,
      utm_campaign: searchParams.get("utm_campaign") || undefined,
      utm_term: searchParams.get("utm_term") || undefined,
      utm_content: searchParams.get("utm_content") || undefined,
    };

    // UTM 파라미터가 있는 경우에만 처리
    const hasUTM = Object.values(utmParams).some((v) => v !== undefined);
    
    if (hasUTM) {
      // 세션 스토리지에 UTM 저장 (후속 페이지에서도 추적 가능)
      sessionStorage.setItem("utm_params", JSON.stringify(utmParams));

      // GA4에 캠페인 유입 이벤트 전송
      window.gtag("event", "campaign_landing", {
        ...utmParams,
        landing_page: pathname,
      });
    }
  }, [searchParams, pathname]);

  return null;
}

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            send_page_view: true,
          });
        `}
      </Script>
      <UTMTracker />
    </>
  );
}

// 이벤트 추적 유틸리티
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// 페이지뷰 추적
export function trackPageView(url: string) {
  if (typeof window !== "undefined" && window.gtag && GA_MEASUREMENT_ID) {
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}

// gtag 타입 선언
declare global {
  interface Window {
    gtag: (
      command: "config" | "event" | "js",
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}
