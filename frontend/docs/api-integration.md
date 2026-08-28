# API 연동 현황

기준 문서: `docs/api-endpoints.md`, `frontend/docs/screens.md`, `frontend/docs/state.md`
분석 범위: `frontend/` 전체. `backend/`는 분석 및 수정 대상에서 제외했다.

## 1. 현재 연동된 API 목록

| API | 호출 위치 | 사용하는 화면/흐름 | 성공 시 처리 방식 | 명세 상태 |
| --- | --- | --- | --- | --- |
| `GET /api/auth/kakao/authorize` | `src/api/kakaoAuthApi.js` | `LoginScreen` 카카오 로그인 | 서버 인증 페이지를 열고 딥링크로 받은 `accessToken`, `refreshToken`, `isNewUser`, `isOnboarded`를 `AuthContext`에 저장 | 명세 있음 |
| `POST /api/auth/kakao` | `src/api/authApi.js` | 예비 카카오 코드 로그인 함수 | 응답을 로그인 데이터로 사용하도록 래퍼 제공 | 명세 있음, 현재 주 로그인 흐름은 authorize 방식 |
| `POST /api/auth/apple` | `src/api/authApi.js`, `src/contexts/AuthContext.js` | `LoginScreen` 애플 로그인 | 토큰과 사용자 정보를 정규화하고 SecureStore 저장, 로그인 상태 갱신 | 명세 있음 |
| `POST /api/auth/refresh` | `src/api/authApi.js`, `src/api/apiClient.js`, `src/contexts/AuthContext.js` | 인증 만료 시 공통 API 클라이언트 | 새 토큰 저장 후 실패했던 요청 재시도 | 명세 있음 |
| `GET /api/users/me` | `src/api/authApi.js`, `src/contexts/AuthContext.js` | 앱 부팅, 로그인 직후 사용자 복구 | 사용자 정보를 `AuthContext.user`에 반영 | 명세 있음 |
| `POST /api/users/me/onboarding` | `src/api/authApi.js`, `src/screens/OnboardingScreen.js`, `src/contexts/AuthContext.js` | 온보딩 완료 | 닉네임/세대 정보를 저장하고 `isOnboarded` 갱신 | 명세 있음 |
| `GET /api/users/nickname-check?nickname=` | `src/api/authApi.js`, `src/screens/OnboardingScreen.js` | 온보딩 닉네임 중복 확인 | 사용 가능 여부를 `nicknameStatus`에 반영 | 명세 있음 |
| `DELETE /api/users/me` | `src/api/authApi.js`, `src/screens/SettingsScreen.js` | 회원 탈퇴 | 로컬 인증 상태 초기화 후 로그인 화면으로 이동 | 명세 있음 |
| `GET /api/auth/resident-status` | `src/screens/ResidentVerificationScreen.js` | 거주자 인증 화면 | 인증 상태, 남은 횟수, 현재 지역 정보를 화면 상태에 반영 | 명세 있음 |
| `POST /api/auth/resident-verify` | `src/screens/ResidentVerificationScreen.js`, `src/api/authApi.js` | 거주자 인증 제출 | 성공 시 인증 상태와 사용자 지역 정보를 갱신하고 `updateUser` 호출 | 명세 있음 |
| `GET /api/regions` | `src/api/regionApi.js`, `src/hooks/useRegions.js` | `MainScreen`, `RegionSelector`, 지역 기반 화면 | 지역 목록을 화면 선택지와 후보 지역 데이터로 사용 | 명세 있음 |
| `GET /api/predictions/featured` | `src/screens/HotLocalScreen.js`, `src/api/predictionApi.js` | 핫로컬 화면 | 주간 핫로컬 데이터를 정규화해 랭킹 카드로 표시 | 명세 있음 |
| `GET /api/places/adopted?regionCode=` | `src/screens/MapScreen.js`, `src/screens/AdoptedPlacesScreen.js`, `src/screens/AllRecommendScreen.js` | 지도 탭, 채택 명소 전체, 지역 추천 목록 | 채택 명소 목록을 정규화해 리스트/마커/상세 이동 데이터로 사용 | 명세 있음 |
| `GET /api/posts/{postId}/comments` | `src/screens/PostDetailScreen.js` | 게시글 상세 댓글 | 댓글 목록을 화면 상태에 반영 | 명세 있음 |
| `POST /api/posts/{postId}/comments` | `src/screens/PostDetailScreen.js` | 게시글 상세 댓글 작성 | 서버 댓글을 목록 상단에 추가하고 댓글 수 상태 갱신 | 명세 있음 |
| `POST /api/posts/{postId}/like` | `src/screens/ChatRoomScreen.js`, `src/screens/PostDetailScreen.js` | 소통방, 게시글 상세 좋아요 | 낙관적 업데이트 후 서버의 `liked`, `likeCount` 값으로 보정 | 명세 있음 |
| `GET /api/local-pass/balance` | `src/state/localPassStore.js`, `src/screens/LocalPassScreen.js` | 로그인 후 잔액 동기화, 로컬패스 화면 | 잔액을 `localPassStore`와 화면 상태에 반영 | 명세 있음 |
| `GET /api/local-pass/history` | `src/screens/LocalPassScreen.js`, `src/screens/PassHistoryScreen.js` | 로컬패스 화면, 사용 내역 화면 | 사용 내역을 정규화해 목록으로 표시 | 명세 있음 |
| `POST /api/local-pass/use` | `src/screens/LocalPassScreen.js` | 로컬패스 사용 | 성공 시 서버 잔액/이력으로 화면 상태 갱신 | 명세 있음 |
| `GET /api/posts?region=` | `src/screens/ChatRoomScreen.js` | 소통방 게시글 목록 | `user.regionCode`를 기준으로 지역 게시글을 정규화해 표시 | 명세 있음 |
| `POST /api/posts` | `src/screens/ChatRoomScreen.js` | 소통방 게시글 작성 | 생성 게시글을 목록에 추가하고 서버 목록을 재조회 | 명세 있음 |
| `POST /api/posts/{postId}/adopt` | `src/screens/ChatRoomScreen.js` | 채택 투표 | 거주자 인증 사용자만 투표하고 채택 상태를 갱신 | 명세 있음 |
| `GET /api/posts/{postId}` | `src/screens/PostDetailScreen.js` | 게시글 상세 | route 데이터로 초기 표시 후 서버 상세 데이터로 갱신 | 명세 있음 |
| `DELETE /api/posts/{postId}` | `src/screens/PostDetailScreen.js` | 본인 게시글 삭제 | 삭제 성공 후 이전 화면으로 이동 | 명세 있음 |
| `GET /api/ping` | `src/api/devApi.js` | 개발용 API 래퍼 | ping 결과 반환 | 명세 있음, 현재 연결 화면 없음 |
| Kakao Local `coord2regioncode` | `src/api/kakaoApi.js`, `src/screens/ResidentVerificationScreen.js` | GPS 기반 행정구역 조회 | 좌표를 시도/시군구 이름으로 변환해 거주자 인증 요청에 사용 | 외부 API |
| 한국관광공사 `areaBasedList2`, `locationBasedList2` | `src/api/tourismApi.js` | 관광지 API 래퍼 | 관광지 목록 응답 반환 | 외부 API, 현재 연결 화면 없음 |

## 2. mock 폴백 사용 중인 API 목록

| API | 화면 | 실패 시 사용하는 mock/로컬 데이터 | 폴백 동작 | 폴백 이유 |
| --- | --- | --- | --- | --- |
| `GET /api/predictions/featured` | `HotLocalScreen` | `src/mocks/hotLocalMockData.js`의 `hotLocalData` | API 실패 시 기존 mock 랭킹을 계속 표시 | 명세는 있으나 서버/네트워크 실패 시 화면 유지 목적 |
| `GET /api/places/adopted?regionCode=` | `AdoptedPlacesScreen` | 화면 내부 `adoptedPlaceItems` | API 실패 안내와 재시도 버튼 표시, 기존 mock 데이터 유지 | 명세는 있으나 실패 시 빈 화면 방지 |
| `GET /api/places/adopted?regionCode=` | `AllRecommendScreen` | `src/mocks/mapMockData.js`의 `recommendedPlaces` | API 실패 안내와 재시도 버튼 표시, mock 추천 목록으로 대체 | 명세는 있으나 실패 시 지역 추천 화면 유지 |
| `GET /api/places/adopted?regionCode=` | `MapScreen` | 없음 | API 실패 시 마커와 하단 추천을 비움 | mock 마커 혼동 방지를 위해 폴백 제거됨 |
| `GET /api/posts?region=` | `ChatRoomScreen` | `src/mocks/chatRoomMockData.js`의 `initialPosts` | API 실패 시 mock 게시글 목록 표시 | 네트워크/API 실패 시 소통방을 유지하기 위한 폴백 |
| `POST /api/posts` | `ChatRoomScreen` | 입력값 기반 로컬 게시글 객체 | API 실패 시 로컬 게시글을 목록에 추가 | 작성 실패 시 입력 결과를 잃지 않기 위한 폴백 |
| `POST /api/posts/{postId}/like` | `ChatRoomScreen`, `PostDetailScreen` | `postLikeCounts` 전역 상태와 화면 내 낙관적 값 | API 실패 시 사용자에게 안내하고 로컬 상태를 유지/복구 | 좋아요 UX 지연 방지 |
| `GET /api/posts/{postId}/comments` | `PostDetailScreen` | 화면 내부 `INITIAL_COMMENTS`, `createInitialComments` | API 실패 시 초기 댓글 목록 유지 | 명세는 있으나 실패 시 상세 화면 유지 |
| `POST /api/posts/{postId}/comments` | `PostDetailScreen` | 입력값 기반 로컬 댓글 객체 | API 실패 시 로컬 댓글을 목록에 추가 | 댓글 작성 실패 시 UX 유지 |
| `GET /api/local-pass/balance` | `LocalPassScreen`, `localPassStore` | `localPassSummary.currentBalance`, 기존 store 값 | API 실패 시 기존 잔액/초기값 유지 | 네트워크/API 실패 시 마지막 잔액을 유지하기 위한 폴백 |
| `GET /api/local-pass/history` | `LocalPassScreen`, `PassHistoryScreen` | `src/mocks/localPassMockData.js`의 `usageHistory` | API 실패 안내와 함께 mock 사용 내역 유지 | 네트워크/API 실패 시 내역 화면을 유지하기 위한 폴백 |
| `POST /api/local-pass/use` | `LocalPassScreen` | 로컬 차감 및 로컬 사용 내역 객체 | API 실패 시 로컬 사용 처리로 대체 | 사용 결과를 즉시 표시하기 위한 임시 폴백 |
| `GET /api/regions` | `MainScreen`, `RegionSelector` | `src/mocks/mainMockData.js`의 `candidateRegions`, `statusItems` 일부 | 지역 API 실패 시 후보 지역/상태 일부를 mock 기준으로 표시 | 지역 API 실패 시 홈 화면 빈 영역 방지 |

## 3. 미연동 API 목록

| API | 현재 프론트 상태 | 필요한 화면/기능 | 비고 |
| --- | --- | --- | --- |
| `GET /api/auth/kakao/callback?code=` | 프론트 직접 호출 없음 | 없음 | 서버 내부 콜백 성격이라 앱 직접 연동 대상이 아님 |
| `GET /api/regions/{regionCode}` | `src/api/regionApi.js`, `src/screens/MapScreen.js` | 지도 지역 중심 좌표 확인 | 선택 지역의 API 좌표가 없을 때 상세 조회 후 프론트 좌표 테이블로 폴백 |
| `GET /api/regions/search?sido=&sigungu=` | `regionApi.searchRegionByName` 래퍼만 있고 화면 사용 없음 | 거주자 인증, 지역 선택 검색 | 현재 거주자 인증은 Kakao 좌표 변환 후 바로 인증 API 호출 |
| `GET /api/predictions?week=&limit=` | 화면 사용 없음 | 핫로컬 전체 랭킹, 과거 주차 랭킹 | `HotLocalScreen`은 featured API만 사용 |
| `GET /api/dev/visitors` | `predictionApi`, `devApi` 래퍼만 있음 | 없음 | `DevScreen` 제거 후 사용자 화면 연결 없음, 명세에도 없음 |

## 4. 완전히 mock으로만 동작하는 기능

| 기능 | 위치 | mock 데이터 | 백엔드 연동 필요 여부 | 비고 |
| --- | --- | --- | --- | --- |
| 알림 목록 | `src/screens/NotificationScreen.js` | 화면 내부 알림 3건 | 필요 | 읽음 처리도 로컬 상태만 변경된다 |
| 홈 화면 상단 상태/요약 | `src/screens/MainScreen.js` | `src/mocks/mainMockData.js`의 `statusItems`, `adoptedPlaces` | 부분 필요 | 지역 목록은 API를 쓰지만 홈 요약/채택 명소 일부는 mock 기반 |
| 지도 세대 필터 옵션 | `src/screens/MapScreen.js` | `src/mocks/mapMockData.js`의 `generationFilters` | 낮음 | 고정 enum 성격이면 프론트 상수 유지 가능 |
| 유사 장소 추천 | `src/screens/MapScreen.js` | 화면 내부 `createSimilarPlaces` 생성값 | 필요 | 실제 주변/유사 추천 품질이 필요하면 API 필요 |
| 로컬패스 적립 방법/진행 요약 | `src/screens/LocalPassScreen.js` | `src/mocks/localPassMockData.js`의 `earningMethods`, `localPassSummary`와 `myPostProgress` | 필요 | 실제 미션/적립 정책과 사용자 진행률은 서버 기준이 적합 |
| 개인정보 처리방침/이용약관 | `src/screens/PrivacyPolicyScreen.js`, `src/screens/TermsScreen.js` | 정적 화면 텍스트 | 낮음 | 운영 정책 변경이 잦으면 CMS/API 연동 고려 |

## 5. 백엔드 연동 우선순위

| 우선순위 | 대상 | 필요한 이유 | 관련 화면 |
| --- | --- | --- | --- |
| 1 | 알림 API 및 읽음 상태 영속화 | 현재 알림 3건이 완전 mock이고 앱 재시작 후 상태가 사라진다 | `NotificationScreen`, `MainScreen` |
| 2 | 지도 지역 상세 좌표 서버 보완 | 일부 지역 API 응답에 중심 좌표가 없어 프론트 정적 좌표 테이블에 의존한다 | `MapScreen`, 지역 API |
| 3 | 로컬패스 사용 결과 정합성 검증 | 잔액·이력은 보상성 데이터라 서버 결과와 로컬 폴백의 불일치를 방지해야 한다 | `LocalPassScreen`, `PassHistoryScreen`, `localPassStore` |
| 4 | 핫로컬 전체/과거 주차 API 연결 | 현재 화면은 featured API만 사용하고 전체 랭킹 API는 미사용이다 | `HotLocalScreen` |
| 5 | 지역 검색 API 활용 | 인증 및 지역 선택 입력을 서버 지역 목록과 일관되게 검증할 수 있다 | `ResidentVerificationScreen`, `RegionSelector` |
| 6 | 미사용 API 래퍼 정리 | 연결 화면 없는 `devApi`, `tourismApi`, 일부 region 래퍼의 운영 목적을 확정해야 한다 | API 모듈 |
