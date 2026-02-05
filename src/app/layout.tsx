import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FloatingChat } from "@/components/chat/FloatingChat";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { KakaoPixel } from "@/components/analytics/KakaoPixel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kontinue | SME 기업가치 평가",
  description: "최소한의 정보로 귀사의 기업가치를 빠르게 확인하세요. EV/EBITDA 멀티플 기반 상대가치 평가.",
  keywords: ["기업가치", "밸류에이션", "M&A", "SME", "중소기업", "EBITDA"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <GoogleAnalytics />
        <KakaoPixel />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {children}
        <FloatingChat />
      </body>
    </html>
  );
}
