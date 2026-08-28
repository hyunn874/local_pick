# Frontend State

이 문서는 `frontend/` 현재 코드 기준으로 `frontend/src/contexts/`와 `frontend/src/state/`의 전역 상태를 정리했다.

## 전역 상태 목록

| 상태 | 파일 | 저장 방식 | 역할 |
| --- | --- | --- | --- |
| `AuthContext` | `frontend/src/contexts/AuthContext.js` | React Context + React state + Expo SecureStore | 인증, 토큰, 사용자 정보, 온보딩, 게스트 모드, 토큰 갱신, 로그인 후 로컬패스 잔액 동기화 |
| `localPassStore` | `frontend/src/state/localPassStore.js` | 모듈 전역 변수 + listener 배열 + hook + 서버 동기화 함수 | 로컬패스 보유 개수 공유 및 `/api/local-pass/balance` 동기화 |
| `postLikeCounts` | `frontend/src/state/postLikeCounts.js` | 모듈 전역 객체 | 게시글 좋아요 수/내 좋아요 여부 화면 간 임시 공유 |
| `postCommentCounts` | `frontend/src/state/postCommentCounts.js` | 모듈 전역 객체 | 게시글 댓글 수 화면 간 임시 공유 |
| `myPostProgress` | `frontend/src/state/myPostProgress.js` | 모듈 전역 변수 | 내 게시글의 채택 진행률 임시 공유 |

## AuthContext

파일: `frontend/src/contexts/AuthContext.js`

### 역할

- 앱 시작 시 `SecureStore`의 `localpick.auth`를 읽어 로그인 상태를 복원한다.
- 카카오/Apple/개발용 로그인을 처리하고 사용자 정보와 토큰을 저장한다.
- 신규/미온보딩 사용자를 `OnboardingScreen`으로 보내기 위한 `isOnboarded` 상태를 관리한다.
- 게스트 모드를 관리한다.
- `apiClient`에 accessToken getter와 401 처리 콜백을 등록한다.
- refreshToken으로 accessToken 갱신을 시도하고 실패하면 인증 상태를 초기화한다.
- 로그인 상태 적용 후 `syncBalanceFromServer(accessToken)`로 로컬패스 잔액을 서버와 동기화한다.

### 상태값

| 값 | 설명 |
| --- | --- |
| `user` | 현재 사용자 객체. 로그인하지 않았으면 `null` |
| `accessToken` | API 인증용 access token |
| `refreshToken` | 토큰 갱신용 refresh token |
| `isOnboarded` | 온보딩 완료 여부 |
| `isGuest` | 로그인 없이 둘러보기 모드 여부 |
| `isInitializing` | SecureStore 복원 중 여부 |
| `isLoggedIn` | `Boolean(user)`로 계산되는 로그인 여부 |
| `accessTokenRef` | 비동기 API handler에서 최신 accessToken을 참조하기 위한 ref |
| `refreshTokenRef` | 비동기 토큰 갱신에서 최신 refreshToken을 참조하기 위한 ref |

### 주요 함수

| 함수 | 설명 |
| --- | --- |
| `useAuth()` | AuthContext 값을 읽는 hook |
| `loginWithKakao()` | 카카오 로그인 후 사용자 정보를 적용한다. |
| `loginWithApple()` | Apple identityToken을 서버에 전달해 로그인한다. |
| `devLogin()` | 개발용 사용자(`DEV_USER`)로 로그인한다. |
| `completeOnboarding(nextOnboardingState, nextGenerationTag)` | 닉네임/세대 온보딩 API 호출 후 `isOnboarded`를 true로 저장한다. |
| `logout()` | 인증 상태와 SecureStore 값을 초기화한다. |
| `resetAuthState` | `clearAuthState` 별칭. 회원탈퇴 후 초기화에 사용된다. |
| `startGuestMode()` | 게스트 모드를 켠다. |
| `exitGuestMode()` | 게스트 모드를 끄고 로그인 화면 분기로 돌아가게 한다. |
| `updateUser(nextUserState)` | 저장된 user 객체와 현재 user 객체를 병합해 갱신한다. |
| `handleUnauthorized()` | 401 발생 시 refreshToken으로 토큰 갱신을 시도한다. |

### 사용하는 화면/모듈

| 사용처 | 사용 내용 |
| --- | --- |
| `RootTabNavigator.js` | AuthGate 분기, 게스트 제한 탭 처리, SettingsRoute guard |
| `LoginScreen` | 카카오/Apple/개발용 로그인, 게스트 모드 시작 |
| `OnboardingScreen` | 온보딩 완료, 로그아웃 |
| `MainScreen` | 사용자 지역 표시, 게스트 배너, 로그인 유도 |
| `MapScreen` | 게스트 여부, 사용자 지역 기반 초기 선택, 로컬패스 사용 시 로그인 유도 |
| `ChatRoomScreen` | accessToken 로그, 사용자 지역/닉네임/거주자 상태 |
| `LocalPassScreen` | 게스트 분기, accessToken, 사용자 정보, 로그아웃 |
| `HotLocalScreen` | 게스트의 소통방 이동 제한 |
| `AdoptedPlacesScreen` | 사용자 거주지 `regionCode`로 채택 명소 조회 |
| `SettingsScreen` | 로그아웃, 회원탈퇴 후 인증 상태 초기화 |
| `PostDetailScreen` | 댓글 fallback 작성자 닉네임 |
| `ResidentVerificationScreen` | accessToken과 updateUser를 사용해 거주자 인증 성공 후 사용자 인증 상태를 갱신 |
| `localPassStore` | 로그인 성공 후 잔액 동기화 함수 호출 |

## localPassStore

파일: `frontend/src/state/localPassStore.js`

### 역할

- 로컬패스 보유 개수를 화면 간 공유한다.
- React Context 없이 모듈 전역 `balance`와 listener 배열로 동기화한다.
- `useBalance(initialBalance)` hook을 통해 balance 변경 시 구독 컴포넌트를 다시 렌더링한다.
- `syncBalanceFromServer(token)`으로 `/api/local-pass/balance`를 호출해 앱 메모리 잔액을 서버 값으로 갱신한다.

### 상태값

| 값 | 설명 |
| --- | --- |
| `balance` | 현재 로컬패스 개수. 초기값 3 |
| `hasInitialized` | `useBalance(initialBalance)`의 최초 초기화 여부 |
| `listeners` | balance 변경을 구독하는 React state setter 목록 |

### 주요 함수

| 함수 | 설명 |
| --- | --- |
| `getBalance()` | 현재 `balance`를 반환한다. |
| `setBalance(newBalance)` | 음수가 되지 않도록 보정한 뒤 `balance`를 갱신하고 listener에 알린다. |
| `useBalance(initialBalance)` | balance state와 setter를 반환하고 mount/unmount에 따라 listener를 등록/해제한다. |
| `syncBalanceFromServer(token)` | accessToken이 있으면 `GET /api/local-pass/balance`를 호출하고 `data.data.balance`를 `setBalance`에 반영한다. 실패 시 console error만 남긴다. |

### 사용하는 화면/모듈

| 사용처 | 사용 내용 |
| --- | --- |
| `AuthContext` | 로그인 성공 후 서버 잔액 동기화 |
| `MapScreen` | `useBalance()`로 구독하고, 로컬패스 사용 시 `getBalance()`/`setBalance()`로 차감한다. |
| `LocalPassScreen` | `useBalance(user?.localPassBalance ?? getBalance())`로 보유 개수를 표시하고 API/fallback 결과를 반영한다. |

## postLikeCounts

파일: `frontend/src/state/postLikeCounts.js`

### 역할

- `PostDetailScreen`에서 변경한 게시글 좋아요 수와 내 좋아요 여부를 `ChatRoomScreen`으로 되돌아왔을 때 반영하기 위한 임시 저장소다.

### 상태값

| 값 | 설명 |
| --- | --- |
| `likeCounts` | key는 `String(postId)`, value는 `{ count, isLiked }` 형태의 객체 |

### 주요 함수

| 함수 | 설명 |
| --- | --- |
| `setPostLikeCount(postId, count, isLiked)` | 게시글별 좋아요 수와 좋아요 여부를 저장한다. `postId`가 null/undefined면 무시한다. |
| `getPostLikeCounts()` | 전체 좋아요 임시 상태 객체를 반환한다. |

### 사용하는 화면

| 화면 | 사용 내용 |
| --- | --- |
| `PostDetailScreen` | 좋아요 optimistic update 및 API 응답 반영 시 저장한다. |
| `ChatRoomScreen` | focus 시 저장된 좋아요 상태를 피드 게시글에 병합한다. |

## postCommentCounts

파일: `frontend/src/state/postCommentCounts.js`

### 역할

- `PostDetailScreen`에서 조회/작성한 댓글 수를 `ChatRoomScreen` 목록의 댓글 수에 반영하기 위한 임시 저장소다.

### 상태값

| 값 | 설명 |
| --- | --- |
| `postCommentCounts` | key는 `String(postId)`, value는 댓글 개수 |

### 주요 함수

| 함수 | 설명 |
| --- | --- |
| `setPostCommentCount(postId, count)` | 게시글별 댓글 수를 저장한다. `postId`가 null/undefined면 무시한다. |
| `getPostCommentCounts()` | 전체 댓글 수 임시 상태 객체를 반환한다. |

### 사용하는 화면

| 화면 | 사용 내용 |
| --- | --- |
| `PostDetailScreen` | 댓글 목록 조회 성공, 댓글 작성 성공/fallback 시 댓글 수를 저장한다. |
| `ChatRoomScreen` | focus 시 저장된 댓글 수를 피드 게시글에 병합한다. |

## myPostProgress

파일: `frontend/src/state/myPostProgress.js`

### 역할

- 내가 작성한 게시글의 채택 진행률을 `LocalPassScreen`의 “채택까지 현황”에 보여주기 위한 임시 저장소다.

### 상태값

| 값 | 설명 |
| --- | --- |
| `myPostProgress` | 초기값 `null`. 저장 시 `{ title, progress, likes, targetLikes }` 형태 |

### 주요 함수

| 함수 | 설명 |
| --- | --- |
| `setMyPostProgress(nextProgress)` | 내 게시글 진행률 정보를 저장한다. |
| `getMyPostProgress()` | 현재 저장된 진행률 정보를 반환한다. |

### 사용하는 화면

| 화면 | 사용 내용 |
| --- | --- |
| `ChatRoomScreen` | 내 게시글 작성 또는 내 게시글 좋아요 변경 시 진행률을 저장한다. |
| `PostDetailScreen` | 내 게시글 상세에서 좋아요 변경 시 진행률을 저장한다. |
| `LocalPassScreen` | focus 시 `getMyPostProgress()`를 읽어 “진행 중인 명소” 카드에 표시한다. |

## 화면 로컬 state 참고

- `NotificationScreen`: mock 알림 목록을 local state로 관리하고, 카드 클릭 시 해당 알림의 `isRead`를 true로 바꾼다.
- `MapScreen`: `selectedRegion`, `regionRecommendations`, `selectedPin`, `selectedFilter`, `searchText`로 선택 지역/추천/지도 bottom sheet 상태를 관리한다.
- `PassHistoryScreen`: API 로딩 여부와 사용 내역 목록을 local state로 관리한다.
- `AdoptedPlacesScreen`: API 로딩 여부, 채택 명소 목록, 세대 필터를 local state로 관리한다.
- `AllRecommendScreen`: route param 지역 기준 채택 명소 목록과 로딩 여부를 local state로 관리한다.

## 상태 관리 특성 및 주의점

- `state/`의 모듈 전역 상태들은 앱 프로세스 메모리에만 존재한다. 앱 재시작, 번들 reload, 프로세스 종료 후에는 유지되지 않는다.
- `localPassStore`는 앱 재시작 후 로그인 성공 시 서버 잔액 동기화를 시도하지만, 서버 API 명세는 현재 `docs/api-endpoints.md`에 별도 기재되어 있지 않다.
- `postLikeCounts`, `postCommentCounts`, `myPostProgress`에는 구독 기능이 없다. 화면 focus 또는 직접 읽기 시점에만 반영된다.
- `localPassStore`만 listener 기반 구독을 제공한다.
- `AuthContext`만 SecureStore에 저장되어 앱 재시작 후 복원된다.
- `ResidentVerificationScreen`은 `useAuth()`에서 `accessToken`, `updateUser`를 함께 받아 인증 성공 후 사용자 상태를 갱신한다.
