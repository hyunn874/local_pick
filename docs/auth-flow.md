# LocalPick 인증 흐름

> **최종 갱신:** 2026-08-28

---

## JWT 토큰 정책

| 토큰 | 유효기간 | 용도 |
|------|----------|------|
| Access Token | 2시간 (7,200초) | API 요청 인증 |
| Refresh Token | 14일 (1,209,600초) | Access Token 갱신 |

---

## 1. 카카오 로그인

앱 → 백엔드 콜백 방식 (Expo 프록시 서비스 종료로 확정).

```
┌──────┐         ┌──────────┐         ┌────────┐
│  앱  │         │ 백엔드   │         │ 카카오  │
└──┬───┘         └────┬─────┘         └───┬────┘
   │  WebBrowser 열기  │                   │
   │──────────────────>│                   │
   │  GET /api/auth/   │                   │
   │  kakao/authorize  │                   │
   │                   │  302 → 카카오     │
   │                   │  로그인 화면      │
   │                   │──────────────────>│
   │                   │                   │
   │                   │  인가코드 콜백    │
   │                   │<──────────────────│
   │                   │  GET /api/auth/   │
   │                   │  kakao/callback   │
   │                   │  ?code=xxx        │
   │                   │                   │
   │                   │  토큰 교환 요청   │
   │                   │──────────────────>│
   │                   │  access_token     │
   │                   │<──────────────────│
   │                   │                   │
   │                   │  사용자 정보 조회 │
   │                   │──────────────────>│
   │                   │  profile 응답     │
   │                   │<──────────────────│
   │                   │                   │
   │  localpick://     │                   │
   │  auth/kakao?      │                   │
   │  accessToken=     │                   │
   │  &refreshToken=   │                   │
   │  &isNewUser=      │                   │
   │  &isOnboarded=    │                   │
   │<──────────────────│                   │
   │                   │                   │
```

**앱 스킴 파라미터:**

| 파라미터 | 설명 |
|----------|------|
| accessToken | JWT Access Token |
| refreshToken | JWT Refresh Token |
| isNewUser | 신규 가입 여부 |
| isOnboarded | 온보딩 완료 여부 |

**실패 시:**

```
localpick://auth/kakao?error=login_failed&message=로그인에+실패했습니다.
```

---

## 2. Apple 로그인

앱에서 Apple Sign In → identityToken을 백엔드로 직접 전달.

```
┌──────┐         ┌──────────┐         ┌────────┐
│  앱  │         │ 백엔드   │         │ Apple  │
└──┬───┘         └────┬─────┘         └───┬────┘
   │  Apple Sign In   │                   │
   │  (네이티브)      │                   │
   │──────────────────────────────────────>│
   │  identityToken   │                   │
   │<──────────────────────────────────────│
   │                   │                   │
   │  POST /api/auth/  │                   │
   │  apple            │                   │
   │  {identityToken}  │                   │
   │──────────────────>│                   │
   │                   │  Apple 공개키     │
   │                   │  조회 (JWKS)      │
   │                   │──────────────────>│
   │                   │  공개키 응답      │
   │                   │<──────────────────│
   │                   │                   │
   │                   │  identityToken    │
   │                   │  서명 검증        │
   │                   │  (jjwt +          │
   │                   │   java.security)  │
   │                   │                   │
   │  JWT 응답         │                   │
   │  {accessToken,    │                   │
   │   refreshToken}   │                   │
   │<──────────────────│                   │
```

**검증 항목:** 서명(RS256), 만료, iss(`https://appleid.apple.com`), aud(앱 Bundle ID)

---

## 3. 토큰 갱신

Access Token 만료 시 프론트에서 자동 갱신.

```
┌──────┐         ┌──────────┐
│  앱  │         │ 백엔드   │
└──┬───┘         └────┬─────┘
   │  API 요청        │
   │  (만료된 AT)      │
   │──────────────────>│
   │  401 A003         │
   │<──────────────────│
   │                   │
   │  POST /api/auth/  │
   │  refresh          │
   │  {refreshToken}   │
   │──────────────────>│
   │  새 AT + RT       │
   │<──────────────────│
   │                   │
   │  원래 API 재요청  │
   │  (새 AT)          │
   │──────────────────>│
   │  정상 응답        │
   │<──────────────────│
```

**주의:** Refresh Token도 만료(14일)되면 재로그인 필요.

---

## 4. 로그인 후 라우팅

```
로그인 성공
    │
    ├─ isOnboarded == false ──→ 온보딩 화면
    │                              │
    │                    닉네임 + 세대 설정
    │                    POST /api/users/me/onboarding
    │                              │
    │                              ▼
    └─ isOnboarded == true ───→ 홈 화면
```

---

## 5. 회원탈퇴

```
DELETE /api/users/me
    │
    ├─ 소프트 삭제 (withdrawn = true, withdrawnAt 기록)
    ├─ 개인정보 즉시 파기 (nickname, kakaoId, appleId, profileImageUrl → null)
    ├─ 로컬패스 잔액 → 0
    └─ 프론트: 토큰 삭제 → 로그인 화면 이동
```

탈퇴 계정으로 재로그인 시 U004 에러 반환.

---

## 6. 프론트엔드 주의사항

- **apiClient 응답 구조**: axios가 아닌 fetch 기반이므로 `response.data`가 아니라 `response` 자체가 JSON. Apple 로그인 콜백에서 특히 주의.
- **토큰 저장**: AsyncStorage에 accessToken, refreshToken 저장.
- **자동 갱신**: apiClient 인터셉터에서 401 수신 시 refresh 호출 → 실패 시 로그인 화면 이동.
