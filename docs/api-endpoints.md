# LocalPick API 명세서

> **Base URL:** `https://localpick-api.fly.dev`
> **최종 갱신:** 2026-08-27

---

## 목차

1. [공통 사항](#공통-사항)
2. [인증 (Auth)](#1-인증-auth)
3. [회원 (User)](#2-회원-user)
4. [거주자 인증 (Verification)](#3-거주자-인증-verification)
5. [지역 (Region)](#4-지역-region)
6. [예측 (Prediction)](#5-예측-prediction)
7. [댓글 (Comment)](#6-댓글-comment)
8. [게시글 (Post)](#7-게시글-post)
9. [채택 명소 (Place)](#8-채택-명소-place)
10. [헬스체크](#9-헬스체크)
11. [Enum 허용값](#enum-허용값)
12. [에러 코드 전체 목록](#에러-코드-전체-목록)

---

## 공통 사항

### 응답 래퍼

모든 API 응답은 `ApiResponse` 래퍼로 감싸진다. `null` 값 필드는 JSON 에서 제외된다.

**성공 응답:**

```json
{
  "success": true,
  "data": { ... }
}
```

**에러 응답:**

```json
{
  "success": false,
  "code": "A001",
  "message": "로그인이 필요합니다."
}
```

### 인증 헤더

인증이 필요한 API 는 요청 헤더에 JWT 를 포함해야 한다.

```
Authorization: Bearer {accessToken}
```

### 인증 규칙 (SecurityConfig)

| 패턴 | 인증 |
|------|------|
| `/api/auth/**` | 불필요 (permitAll) |
| `GET /api/regions/**` | 불필요 |
| `GET /api/**` | 불필요 |
| `POST, PUT, DELETE /api/**` | **필요** |

> GET 은 비로그인도 조회 가능. 쓰기(POST/PUT/DELETE)는 인증 필요.

### 날짜/시간 형식

- `LocalDateTime` → `"2026-08-27T14:30:00"`
- `LocalDate` → `"2026-08-27"`

---

## 1. 인증 (Auth)

### 1-1. 카카오 로그인 시작 (웹브라우저 방식)

앱에서 이 URL 을 웹브라우저로 열면 카카오 로그인 화면으로 리다이렉트된다.
로그인 완료 후 서버가 앱 스킴으로 결과를 돌려보낸다.

```
GET /api/auth/kakao/authorize
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |
| 요청 | 없음 |
| 응답 | 302 리다이렉트 → 카카오 로그인 화면 |

**성공 시 앱 스킴 리다이렉트:**

```
localpick://auth/kakao?accessToken={jwt}&refreshToken={jwt}&isNewUser=true&isOnboarded=false
```

**실패 시 앱 스킴 리다이렉트:**

```
localpick://auth/kakao?error=login_failed&message=로그인에+실패했습니다.
```

---

### 1-2. 카카오 콜백 (서버 내부용)

카카오가 인가코드를 전달하는 콜백. **프론트에서 직접 호출하지 않는다.**

```
GET /api/auth/kakao/callback?code={code}
```

---

### 1-3. 카카오 로그인 (직접 코드 전달)

앱이 인가코드를 직접 받아 서버에 전달할 수 있을 때 사용.

```
POST /api/auth/kakao
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |
| Content-Type | `application/json` |

**요청:**

```json
{
  "code": "인가코드",
  "redirectUri": "https://localpick-api.fly.dev/api/auth/kakao/callback"
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1...",
    "expiresIn": 3600,
    "isNewUser": true,
    "isOnboarded": false,
    "user": {
      "id": 1,
      "kakaoId": "123456789",
      "nickname": null,
      "generationTag": null,
      "generationLabel": null,
      "profileImageUrl": "https://k.kakaocdn.net/...",
      "onboarded": false,
      "localPassBalance": 0
    }
  }
}
```

**에러:**

| 코드 | 상황 |
|------|------|
| A004 | 카카오 토큰 교환 또는 사용자 정보 조회 실패 |
| U004 | 탈퇴한 계정으로 로그인 시도 |

---

### 1-4. Apple 로그인

```
POST /api/auth/apple
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |
| Content-Type | `application/json` |

**요청:**

```json
{
  "identityToken": "eyJraWQiOiJBSURPUE..."
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1...",
    "expiresIn": 3600,
    "isNewUser": true,
    "isOnboarded": false,
    "user": {
      "id": 2,
      "appleId": "001234.abcdef...",
      "nickname": null,
      "generationTag": null,
      "generationLabel": null,
      "onboarded": false,
      "localPassBalance": 0
    }
  }
}
```

**에러:**

| 코드 | 상황 |
|------|------|
| A006 | Apple identityToken 검증 실패 |
| U004 | 탈퇴한 계정으로 로그인 시도 |

---

### 1-5. 토큰 갱신

```
POST /api/auth/refresh
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 (refreshToken 으로 인증) |
| Content-Type | `application/json` |

**요청:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1..."
}
```

**응답:** 1-3과 동일한 형식. `isNewUser` 는 항상 `false`.

**에러:**

| 코드 | 상황 |
|------|------|
| A002 | refreshToken 이 아닌 토큰 전달 |
| A003 | 토큰 만료 |
| U001 | 사용자를 찾을 수 없음 |

---

## 2. 회원 (User)

### 2-1. 내 정보 조회

```
GET /api/users/me
```

| 항목 | 값 |
|------|----|
| 인증 | **필요** |

**응답:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "kakaoId": "123456789",
    "nickname": "유성구주민",
    "generationTag": "TWENTIES",
    "generationLabel": "20대",
    "profileImageUrl": "https://k.kakaocdn.net/...",
    "onboarded": true,
    "localPassBalance": 5
  }
}
```

> `kakaoId`, `appleId`, `profileImageUrl` 등 null 인 필드는 응답에서 제외된다.

**에러:**

| 코드 | 상황 |
|------|------|
| A001 | 토큰 없음 |
| U001 | 사용자를 찾을 수 없음 |

---

### 2-2. 온보딩 (닉네임·세대 설정)

```
POST /api/users/me/onboarding
```

| 항목 | 값 |
|------|----|
| 인증 | **필요** |
| Content-Type | `application/json` |

**요청:**

```json
{
  "nickname": "유성구주민",
  "generationTag": "TWENTIES"
}
```

| 필드 | 타입 | 제약 |
|------|------|------|
| nickname | string | 2~12자, 한글/영문/숫자/밑줄만, 정규식: `^[가-힣a-zA-Z0-9_]+$` |
| generationTag | string | `"TWENTIES"`, `"THIRTIES_FORTIES"`, `"FIFTIES_PLUS"` |

**응답:** 2-1과 동일한 UserResponse. `onboarded: true`, `localPassBalance: 5` (가입 보너스).

**에러:**

| 코드 | 상황 |
|------|------|
| U002 | 닉네임 중복 |
| U003 | 이미 온보딩 완료 |
| C001 | 닉네임 형식 불일치 / generationTag 누락 |

---

### 2-3. 닉네임 중복 확인

```
GET /api/users/nickname-check?nickname={nickname}
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 (GET) |

**응답:**

```json
{
  "success": true,
  "data": {
    "nickname": "유성구주민",
    "available": true
  }
}
```

---

### 2-4. 회원탈퇴

```
DELETE /api/users/me
```

| 항목 | 값 |
|------|----|
| 인증 | **필요** |

**응답:**

```json
{
  "success": true,
  "data": null
}
```

**에러:**

| 코드 | 상황 |
|------|------|
| A001 | 토큰 없음 |
| U001 | 사용자를 찾을 수 없음 |

---

## 3. 거주자 인증 (Verification)

### 3-1. 거주자 인증 체크인

```
POST /api/auth/resident-verify
```

| 항목 | 값 |
|------|----|
| 인증 | **필요** (토큰에서 userId 추출) |
| Content-Type | `application/json` |

**요청:**

```json
{
  "sidoName": "대전광역시",
  "sigunguName": "유성구"
}
```

> **주의:** latitude, longitude 를 보내지 않는다. 행정구역 텍스트만 전달.

**인증 정책:**

| 회차 | 조건 |
|------|------|
| 1회차 | 즉시 (최초 인증) |
| 2회차 | 1회차로부터 6~8일 후 → `isVerified: true` |
| 3회차~ | 전회 인증일로부터 27~33일 후 (매월 재인증) |

- 다른 지역에서 인증하면 기존 인증 초기화 + 새 지역 1회차

**응답:**

```json
{
  "success": true,
  "data": {
    "verifyCount": 1,
    "isVerified": false,
    "nextVerifyDate": "2026-09-02",
    "badgeStatus": "inactive"
  }
}
```

2회차 완료 후:

```json
{
  "success": true,
  "data": {
    "verifyCount": 2,
    "isVerified": true,
    "nextVerifyDate": "2026-09-30",
    "badgeStatus": "active"
  }
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| verifyCount | int | 누적 인증 횟수 (1, 2, 3…) |
| isVerified | boolean | 2회 이상 인증 완료 여부 |
| nextVerifyDate | string (date) / null | 다음 인증 가능일. 1회차 직후에는 null 이 아닌 6일 후 날짜 |
| badgeStatus | string | `"active"` 또는 `"inactive"` |

**badgeStatus 판정 기준:**

- `"active"`: `isVerified == true` 이고 마지막 인증일로부터 33일 이내
- `"inactive"`: 그 외

**에러:**

| 코드 | 상황 |
|------|------|
| A001 | 토큰 없음 |
| A007 | 인증 가능한 기간이 아님 (너무 이르거나 너무 늦음) |
| R001 | 시도명+시군구명에 해당하는 지역이 없음 |
| U001 | 사용자를 찾을 수 없음 |

---

### 3-2. 인증 상태 조회

```
GET /api/auth/resident-status
```

| 항목 | 값 |
|------|----|
| 인증 | **필요** |

**응답 (인증 기록이 있을 때):**

```json
{
  "success": true,
  "data": {
    "isVerified": true,
    "verifyCount": 3,
    "lastVerifyDate": "2026-08-20",
    "nextVerifyDate": "2026-09-16",
    "badgeStatus": "active"
  }
}
```

**응답 (인증 기록이 없을 때):**

```json
{
  "success": true,
  "data": {
    "isVerified": false,
    "verifyCount": 0,
    "lastVerifyDate": null,
    "nextVerifyDate": null,
    "badgeStatus": "inactive"
  }
}
```

**에러:**

| 코드 | 상황 |
|------|------|
| A001 | 토큰 없음 |

---

## 4. 지역 (Region)

### 4-1. 지역 목록 조회

```
GET /api/regions
GET /api/regions?sido={sidoName}
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| sido | string | 선택 | 시도명 필터. 생략하면 전체 |

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "regionCode": "30200",
      "sidoName": "대전광역시",
      "sigunguName": "유성구",
      "fullName": "대전광역시 유성구",
      "population": 353933,
      "areaKm2": 176.87,
      "populationDensity": 2001.3,
      "densityTier": "MEDIUM",
      "adoptionThreshold": 8,
      "centerLatitude": 36.3622,
      "centerLongitude": 127.3561
    }
  ]
}
```

---

### 4-2. 지역 상세 조회

```
GET /api/regions/{regionCode}
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |

**응답:** 4-1의 단일 객체와 동일.

**에러:**

| 코드 | 상황 |
|------|------|
| R001 | 지역코드에 해당하는 지역 없음 |

---

### 4-3. 행정구역명으로 지역 검색

앱이 Reverse Geocoding 결과(시도명+시군구명)로 지역을 조회할 때 사용.

```
GET /api/regions/search?sido={sidoName}&sigungu={sigunguName}
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| sido | string | 필수 | 시도명 (예: "대전광역시") |
| sigungu | string | 필수 | 시군구명 (예: "유성구") |

**응답:** 4-1의 단일 객체와 동일.

**에러:**

| 코드 | 상황 |
|------|------|
| R001 | 해당하는 지역 없음 |

---

## 5. 예측 (Prediction)

### 5-1. 이 주의 발굴 지역 (홈 화면)

```
GET /api/predictions/featured
GET /api/predictions/featured?week={date}
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| week | string (date) | 선택 | 예측 주 시작일. 생략하면 최신 주 |

**응답:**

```json
{
  "success": true,
  "data": {
    "weekStartDate": "2026-08-24",
    "indicatorBaseYm": "2026-07-01",
    "totalRegions": 3,
    "regions": [
      {
        "ranking": 1,
        "regionId": 42,
        "regionCode": "46720",
        "regionName": "전라남도 신안군",
        "totalScore": 87.3,
        "visitorScore": 92.1,
        "demandScore": 85.0,
        "diversityScore": 82.5,
        "centerLatitude": 34.8312,
        "centerLongitude": 126.1071
      }
    ]
  }
}
```

---

### 5-2. 전체 소외도 순위

```
GET /api/predictions?week={date}&limit={n}
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| week | string (date) | 선택 | 최신 주 | 예측 주 시작일 |
| limit | int | 선택 | 20 | 최대 100 |

**응답:** 5-1과 동일한 형식. `regions` 배열이 limit 만큼.

---

## 6. 댓글 (Comment)

### 6-1. 댓글 작성

```
POST /api/posts/{postId}/comments
```

| 항목 | 값 |
|------|----|
| 인증 | **필요** |
| Content-Type | `application/json` |

**요청:**

```json
{
  "content": "여기 정말 좋아요!"
}
```

**응답:**

```json
{
  "success": true,
  "data": {
    "id": 10,
    "postId": 1,
    "authorId": 5,
    "authorNickname": "유성구주민",
    "authorProfileImageUrl": "https://k.kakaocdn.net/...",
    "content": "여기 정말 좋아요!",
    "createdAt": "2026-08-27T14:30:00"
  }
}
```

**에러:**

| 코드 | 상황 |
|------|------|
| A001 | 토큰 없음 |
| P001 | 게시글을 찾을 수 없음 |
| U001 | 사용자를 찾을 수 없음 |
| C001 | content 가 빈 문자열 |

---

### 6-2. 댓글 목록 조회

```
GET /api/posts/{postId}/comments
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 (GET) |

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "postId": 1,
      "authorId": 5,
      "authorNickname": "유성구주민",
      "authorProfileImageUrl": "https://k.kakaocdn.net/...",
      "content": "여기 정말 좋아요!",
      "createdAt": "2026-08-27T14:30:00"
    }
  ]
}
```

> 작성 시간 오름차순 정렬. 빈 배열이면 `[]`.

**에러:**

| 코드 | 상황 |
|------|------|
| P001 | 게시글을 찾을 수 없음 |

---

## 7. 게시글 (Post)

### 7-1. 좋아요 토글

좋아요가 없으면 추가, 이미 있으면 취소.

```
POST /api/posts/{postId}/like
```

| 항목 | 값 |
|------|----|
| 인증 | **필요** |
| 요청 본문 | 없음 |

**응답 (좋아요 추가 시):**

```json
{
  "success": true,
  "data": {
    "postId": 1,
    "liked": true,
    "likeCount": 5
  }
}
```

**응답 (좋아요 취소 시):**

```json
{
  "success": true,
  "data": {
    "postId": 1,
    "liked": false,
    "likeCount": 4
  }
}
```

**에러:**

| 코드 | 상황 |
|------|------|
| A001 | 토큰 없음 |
| P001 | 게시글을 찾을 수 없음 |
| U001 | 사용자를 찾을 수 없음 |

---

## 8. 채택 명소 (Place)

### 8-1. 채택된 명소 목록

지도 핀 표시용. 해당 지역에서 채택 확정된 게시글만 반환.

```
GET /api/places/adopted?regionCode={regionCode}
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 (GET) |

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| regionCode | string | 필수 | 법정동코드 앞 5자리 (예: "30200") |

**응답:**

```json
{
  "success": true,
  "data": [
    {
      "postId": 1,
      "placeName": "엑스포다리 야경 포인트",
      "title": "밤에 가면 진짜 예뻐요",
      "latitude": 36.374,
      "longitude": 127.372,
      "adoptionCount": 12,
      "adoptedAt": "2026-08-20T10:00:00",
      "imageUrls": [
        "https://storage.example.com/img1.jpg"
      ]
    }
  ]
}
```

> 채택된 명소가 없으면 `[]`.

**에러:**

| 코드 | 상황 |
|------|------|
| R001 | 지역코드에 해당하는 지역 없음 |

---

## 9. 헬스체크

### 9-1. 서버 상태

```
GET /api/ping
```

| 항목 | 값 |
|------|----|
| 인증 | 불필요 |

**응답:**

```json
{
  "success": true,
  "data": {
    "service": "localpick",
    "time": "2026-08-27T14:30:00.123456"
  }
}
```

---

## Enum 허용값

### GenerationTag

온보딩 시 세대 선택에 사용.

| 값 | 라벨 |
|----|------|
| `TWENTIES` | 20대 |
| `THIRTIES_FORTIES` | 30·40대 |
| `FIFTIES_PLUS` | 50대 이상 |

### DensityTier

지역의 인구밀도 등급. 읽기 전용 (서버가 계산).

| 값 | 채택 임계값 | 인구밀도 기준 |
|----|------------|--------------|
| `VERY_LOW` | 3 | < 100명/km² |
| `LOW` | 5 | 100~999명/km² |
| `MEDIUM` | 8 | 1000~4999명/km² |
| `HIGH` | 12 | >= 5000명/km² |

### badgeStatus

거주자 배지 상태. 읽기 전용 (서버가 계산, DB 미저장).

| 값 | 조건 |
|----|------|
| `"active"` | isVerified=true 이고 마지막 인증일로부터 33일 이내 |
| `"inactive"` | 그 외 |

---

## 에러 코드 전체 목록

| 코드 | HTTP | 메시지 |
|------|------|--------|
| C001 | 400 | 입력값이 올바르지 않습니다. |
| C002 | 500 | 서버 오류가 발생했습니다. |
| A001 | 401 | 로그인이 필요합니다. |
| A002 | 401 | 유효하지 않은 토큰입니다. |
| A003 | 401 | 토큰이 만료되었습니다. 다시 로그인해 주세요. |
| A004 | 401 | 카카오 로그인에 실패했습니다. |
| A005 | 403 | 닉네임과 세대 설정을 완료해 주세요. |
| A006 | 401 | Apple 로그인에 실패했습니다. |
| A007 | 400 | 인증 가능한 기간이 아닙니다. 다음 인증 가능일을 확인해 주세요. |
| U001 | 404 | 사용자를 찾을 수 없습니다. |
| U002 | 409 | 이미 사용 중인 닉네임입니다. |
| U003 | 409 | 이미 설정을 완료한 계정입니다. |
| U004 | 403 | 탈퇴한 계정입니다. |
| R001 | 404 | 지역을 찾을 수 없습니다. |
| P001 | 404 | 게시글을 찾을 수 없습니다. |
| P002 | 409 | 이미 채택에 참여했습니다. |
| P003 | 403 | 해당 지역 거주자 인증이 필요합니다. |
| P004 | 403 | 본인이 작성한 글만 수정할 수 있습니다. |
| L001 | 400 | 로컬패스 잔액이 부족합니다. |
| E001 | 502 | 외부 API 호출에 실패했습니다. |
