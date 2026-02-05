"use client";

import Script from "next/script";

const KAKAO_PIXEL_ID = "881430";

declare global {
  interface Window {
    kakaoPixel: (id: string) => {
      pageView: () => void;
      completeRegistration: (tag?: string) => void;
      search: (options?: { keyword?: string }) => void;
      viewContent: (options?: { id?: string }) => void;
      addToCart: (options?: { id?: string }) => void;
      purchase: (options?: { total_price?: number; currency?: string }) => void;
      signUp: (tag?: string) => void;
      participation: (tag?: string) => void;
    };
  }
}

export function KakaoPixel() {
  return (
    <>
      <Script
        src="//t1.daumcdn.net/kas/static/kp.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (typeof window !== "undefined" && window.kakaoPixel) {
            window.kakaoPixel(KAKAO_PIXEL_ID).pageView();
          }
        }}
      />
    </>
  );
}

// 카카오 픽셀 이벤트 추적 유틸리티
export function trackKakaoEvent(
  eventType: "pageView" | "completeRegistration" | "search" | "viewContent" | "addToCart" | "purchase" | "signUp" | "participation",
  options?: Record<string, unknown>
) {
  if (typeof window !== "undefined" && window.kakaoPixel) {
    const pixel = window.kakaoPixel(KAKAO_PIXEL_ID);
    
    switch (eventType) {
      case "pageView":
        pixel.pageView();
        break;
      case "completeRegistration":
        pixel.completeRegistration(options?.tag as string);
        break;
      case "search":
        pixel.search(options as { keyword?: string });
        break;
      case "viewContent":
        pixel.viewContent(options as { id?: string });
        break;
      case "addToCart":
        pixel.addToCart(options as { id?: string });
        break;
      case "purchase":
        pixel.purchase(options as { total_price?: number; currency?: string });
        break;
      case "signUp":
        pixel.signUp(options?.tag as string);
        break;
      case "participation":
        pixel.participation(options?.tag as string);
        break;
    }
  }
}
