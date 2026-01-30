/**
 * 날짜/시간 유틸리티 (서울 타임존)
 */

const TIMEZONE = "Asia/Seoul";

/**
 * 날짜를 한국 형식으로 포맷 (YYYY-MM-DD)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  
  return new Date(date).toLocaleDateString("ko-KR", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/**
 * 날짜+시간을 한국 형식으로 포맷 (YYYY-MM-DD HH:mm)
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  
  return new Date(date).toLocaleString("ko-KR", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * 상대 시간 표시 (예: 3분 전, 2시간 전)
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay < 7) return `${diffDay}일 전`;
  
  return formatDate(date);
}
