# 도메인 설정 가이드 (kontinue.xyz)

이 문서는 가비아에서 구매한 `kontinue.xyz` 도메인을 Vercel에 배포된 Next.js 앱에 연결하는 방법을 설명합니다.

## 사전 요구사항

1. Vercel 계정 및 프로젝트 배포 완료
2. 가비아에서 `kontinue.xyz` 도메인 소유
3. 가비아 DNS 관리 콘솔 접근 권한

## 1. Vercel에 도메인 추가

### 1.1 Vercel 대시보드에서 도메인 추가

1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. 프로젝트 선택 → **Settings** → **Domains**
3. 도메인 입력란에 `kontinue.xyz` 입력 → **Add**
4. `www.kontinue.xyz`도 추가 (선택사항)

### 1.2 Vercel이 제공하는 DNS 설정값 확인

Vercel에서 다음과 같은 DNS 설정을 안내합니다:

| Type | Name | Value |
|------|------|-------|
| A | @ | 76.76.21.21 (또는 Vercel이 안내하는 IP) |
| CNAME | www | cname.vercel-dns.com |

> **중요**: 정확한 값은 Vercel 대시보드에서 확인하세요. IP 주소가 다를 수 있습니다.

## 2. 가비아 DNS 설정

### 2.1 가비아 DNS 관리 접속

1. [가비아](https://www.gabia.com) 로그인
2. **My가비아** → **도메인 관리** → `kontinue.xyz` 선택
3. **DNS 관리** 또는 **네임서버/DNS 설정** 메뉴 진입

### 2.2 DNS 레코드 추가

#### A 레코드 (Apex 도메인)

| 필드 | 값 |
|------|-----|
| 타입 | A |
| 호스트 | @ (또는 빈칸) |
| 값/IP 주소 | `76.76.21.21` |
| TTL | 3600 (또는 기본값) |

#### CNAME 레코드 (www 서브도메인)

| 필드 | 값 |
|------|-----|
| 타입 | CNAME |
| 호스트 | www |
| 값/도메인 | `cname.vercel-dns.com.` |
| TTL | 3600 (또는 기본값) |

> **주의**: 가비아에서 CNAME 값 입력 시 끝에 마침표(`.`)가 필요할 수 있습니다.
> `cname.vercel-dns.com.` ← 마침표 포함

### 2.3 기존 레코드 정리

- 기존에 같은 이름의 레코드가 있다면 삭제하거나 수정하세요.
- 특히 A 레코드가 다른 IP로 설정되어 있다면 변경해야 합니다.

## 3. 환경 변수 설정

### 3.1 Vercel 환경 변수

Vercel 대시보드에서 다음 환경 변수를 설정:

```
NEXT_PUBLIC_APP_URL=https://kontinue.xyz
```

### 3.2 로컬 개발 환경

`.env.local` 파일:

```bash
# 개발 환경
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 프로덕션 (참고용)
# NEXT_PUBLIC_APP_URL=https://kontinue.xyz
```

## 4. DNS 전파 확인

DNS 변경 사항이 전파되는 데 최대 48시간이 걸릴 수 있습니다 (보통 수분~수시간).

### 4.1 전파 확인 방법

```bash
# DNS 조회
dig kontinue.xyz +short
dig www.kontinue.xyz +short

# 또는 nslookup
nslookup kontinue.xyz
```

### 4.2 Vercel 상태 확인

Vercel Dashboard → Settings → Domains에서:
- **Valid Configuration** ✓ 표시 확인
- 인증서 자동 발급 (Let's Encrypt) 확인

## 5. HTTPS 인증서

Vercel은 도메인 연결 후 자동으로 Let's Encrypt SSL 인증서를 발급합니다.

- 인증서 발급까지 수 분 소요
- `https://kontinue.xyz`로 접속 가능 확인

## 6. 리다이렉트 설정 (선택)

### www → non-www 리다이렉트

Vercel에서 기본적으로 설정 가능:

1. Domains 설정에서 `www.kontinue.xyz` 선택
2. **Redirect to** → `kontinue.xyz` 설정

또는 `vercel.json`에서:

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "www.kontinue.xyz" }],
      "destination": "https://kontinue.xyz/:path*",
      "permanent": true
    }
  ]
}
```

## 7. 트러블슈팅

### DNS가 전파되지 않는 경우

- 가비아 DNS 캐시 때문일 수 있음 → 시간 대기
- 로컬 DNS 캐시 초기화: `sudo dscacheutil -flushcache` (macOS)

### Vercel에서 "Invalid Configuration" 표시

- DNS 레코드 값이 정확한지 재확인
- A 레코드가 올바른 Vercel IP인지 확인
- CNAME에 마침표가 필요한지 확인

### SSL 인증서 오류

- DNS 전파 완료 후 Vercel이 자동으로 재시도
- 수동으로 **Refresh** 버튼 클릭

## 8. 확인 체크리스트

- [ ] Vercel에 도메인 추가 완료
- [ ] 가비아 A 레코드 설정 완료
- [ ] 가비아 CNAME 레코드 설정 완료 (www용)
- [ ] Vercel에서 "Valid Configuration" 확인
- [ ] HTTPS로 사이트 접속 확인
- [ ] 환경 변수 `NEXT_PUBLIC_APP_URL` 설정
- [ ] 웹훅 콜백 URL 정상 동작 확인

## 참고 링크

- [Vercel 도메인 문서](https://vercel.com/docs/concepts/projects/domains)
- [가비아 DNS 설정 가이드](https://customer.gabia.com/manual/domain/301/1207)
