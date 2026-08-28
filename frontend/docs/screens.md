# Frontend Screens

이 문서는 `frontend/` 현재 코드 기준으로 작성했다. API 접근 조건은 `docs/api-endpoints.md`의 인증 정책을 함께 참고했다.

## 네비게이션 구조

최상위 네비게이션은 `frontend/src/navigation/RootTabNavigator.js`의 Native Stack이다.

| Stack route | Component | 설명 |
| --- | --- | --- |
| `AuthGate` | `AuthGate` | 초기 인증 상태에 따라 로그인, 온보딩, 메인 탭을 분기한다. |
| `Terms` | `TermsScreen` | 이용약관 화면 |
| `PrivacyPolicy` | `PrivacyPolicyScreen` | 개인정보처리방침 화면 |
| `Settings` | `SettingsRoute` | 로그인 사용자는 설정, 게스트/비로그인은 로그인 화면을 표시한다. |
| `AdoptedPlaces` | `AdoptedPlacesScreen` | 거주지 기준 채택 명소 목록 |
| `Notification` | `NotificationScreen` | 알림 목록 |
| `PostDetail` | `PostDetailScreen` | 게시글 상세 |
| `AllRecommend` | `AllRecommendScreen` | 지도 선택 지역 기준 채택 명소 전체 목록 |
| `PassHistory` | `PassHistoryScreen` | 로컬패스 사용 내역 |
| `ResidentVerification` | `ResidentVerificationScreen` | 거주자 인증 |

`AuthGate` 분기:

| 조건 | 표시 화면 |
| --- | --- |
| `isInitializing === true` | 로딩 화면 |
| `!isLoggedIn && !isGuest` | `LoginScreen` |
| `isLoggedIn && isOnboarded === false` | `OnboardingScreen` |
| 그 외 | `MainTabs` |

`MainTabs`는 Bottom Tab Navigator다.

| Tab route | Component | 탭 노출 | 게스트 접근 |
| --- | --- | --- | --- |
| `Main` | `MainScreen` | 노출 | 가능 |
| `Map` | `MapScreen` | 노출 | 가능 |
| `ChatRoom` | `ChatRoomScreen` | 노출 | 탭바에서 차단, 로그인 유도 |
| `LocalPass` | `LocalPassScreen` | 노출 | 탭바에서 차단, 화면 내부도 게스트 안내 표시 |
| `HotLocalScreen` | `HotLocalScreen` | 숨김 | 가능, 단 소통방 이동은 로그인 필요 |

## 전체 화면 목록

| 화면 | Route | 진입 조건 | 이동 가능 화면 | 주요 기능 |
| --- | --- | --- | --- | --- |
| `LoginScreen` | AuthGate 내부 | 비로그인이고 게스트 모드가 아닐 때 표시 | `Terms`, `PrivacyPolicy`, AuthGate 재분기 | 카카오 로그인, Apple 로그인(iOS), 게스트 모드 시작, `__DEV__` 개발용 로그인 |
| `OnboardingScreen` | AuthGate 내부 | 로그인 후 `isOnboarded === false` | AuthGate 재분기 | 닉네임 입력, 닉네임 중복 확인, 세대 선택, 온보딩 완료, 로그아웃 |
| `MainScreen` | `Main` tab | 로그인 사용자 또는 게스트 | `HotLocalScreen`, `AdoptedPlaces`, `Notification`, `ChatRoom` | 홈 대시보드, 이 주의 발굴 지역, 다음 후보 지역, 채택 명소 요약, 활성 지역 수 표시, 게스트 로그인 배너 |
| `MapScreen` | `Map` tab | 로그인 사용자 또는 게스트 | `AllRecommend`, `PostDetail` | 지역 선택, 지도 중심 이동, 지도 마커, 검색, 세대 필터, 선택 지역 기준 채택 명소/추천, 유사 대안, 로컬패스 사용 |
| `ChatRoomScreen` | `ChatRoom` tab | 로그인 필요. 탭바에서 게스트 접근 차단 | `PostDetail`, `ResidentVerification`, OS 공유 시트 | 지역 소통방 피드, 게시글 목록 조회, 검색, 이미지 첨부, 글 작성, 좋아요, 게시글 공유, 거주자 인증 유도 |
| `LocalPassScreen` | `LocalPass` tab | 로그인 필요. 게스트면 로그인 유도 empty state | `Settings`, `PassHistory`, `ResidentVerification`, `Map` | 보유 로컬패스, 사용 내역 API, 로컬패스 사용 API, 획득 방법, 내 게시글 채택 진행률, 로그아웃 |
| `HotLocalScreen` | `HotLocalScreen` hidden tab | 로그인 사용자 또는 게스트 | `ChatRoom`, 뒤로가기 | `GET /api/predictions/featured` 기반 이번 주 핫 로컬 TOP 3, 예측 지표, 순위 확장, 소통방 이동 |
| `AdoptedPlacesScreen` | `AdoptedPlaces` stack | 로그인 사용자 또는 게스트 | 뒤로가기 | 거주지 `regionCode` 기준 `GET /api/places/adopted`, 로딩, API 실패 안내/재시도, 실패 시 기존 mock 유지, 세대 필터, 빈 상태 |
| `AllRecommendScreen` | `AllRecommend` stack | 로그인 사용자 또는 게스트. `route.params.region`이 없으면 지역 선택 안내 | `PostDetail`, 뒤로가기 | 선택 지역 `regionCode` 기준 채택 명소 API 호출, FlatList 목록, 카드 클릭 시 상세 이동, API 실패 안내/재시도 |
| `PostDetailScreen` | `PostDetail` stack | route param `post` 필요. 별도 auth guard 없음 | OS 공유 시트, 뒤로가기 | 게시글 상세, 댓글 조회/작성, 좋아요, 댓글 좋아요, 공유, 좋아요/댓글 수 전역 임시 동기화 |
| `NotificationScreen` | `Notification` stack | 로그인 사용자 또는 게스트 | 뒤로가기 | mock 알림 3개 표시, type별 아이콘, 읽지 않음 초록 점, 알림 클릭 시 읽음 처리, 빈 상태 |
| `PassHistoryScreen` | `PassHistory` stack | 명시적 guard 없음. 보통 `LocalPass`에서 진입하므로 로그인 경로 | 뒤로가기 | `/api/local-pass/history` 호출, 로딩, 성공 시 내역 표시, API 실패 안내/재시도, 실패 시 기존 mock 유지, 빈 상태 |
| `ResidentVerificationScreen` | `ResidentVerification` stack | 명시적 guard 없음. API 요청에는 accessToken 필요 | 인증 완료 후 뒤로가기 | 인증 상태 조회, 지역 입력, GPS 권한 요청, Kakao Reverse Geocoding, `POST /api/auth/resident-verify`, 인증 성공 후 `updateUser` 반영 |
| `SettingsScreen` | `Settings` stack | `SettingsRoute`에서 로그인 필요, 게스트/비로그인은 로그인 화면 표시 | `Terms`, `PrivacyPolicy`, AuthGate reset, 뒤로가기 | 약관/개인정보처리방침 이동, 문의, 앱 버전, 로그아웃, 회원탈퇴 |
| `TermsScreen` | `Terms` stack | 로그인 사용자 또는 게스트 또는 로그인 화면에서 진입 가능 | 뒤로가기 | 이용약관 표시 |
| `PrivacyPolicyScreen` | `PrivacyPolicy` stack | 로그인 사용자 또는 게스트 또는 로그인 화면에서 진입 가능 | 뒤로가기 | 개인정보처리방침 표시 |

## 지도 탭 구조

- `MapScreen`은 `RegionSelector`에서 선택한 지역을 `selectedRegion` state로 보관한다.
- 선택 지역의 중심 좌표는 우선 `region.centerLatitude`, `region.centerLongitude`를 사용한다.
- API 지역 좌표가 없으면 시도명 기준 `regionCoordinates` 매핑을 사용한다.
- `NaverMapView`는 중심 좌표가 바뀌면 내부 Native map key가 바뀌어 `initialCamera`가 새 좌표로 다시 적용된다.
- 하단 섹션 제목은 선택 지역이 있으면 `${selectedRegion.fullName}의 명소`로 표시한다.
- 하단 추천 목록은 선택 지역 `regionCode`로 `GET /api/places/adopted?regionCode=...`를 호출한다.
- 채택 명소 API 실패 시 기존 `recommendedPlaces` mock을 선택 지역명으로 보정해 표시한다.
- `RegionSelector`의 보조 텍스트는 지역 미선택 상태에서는 실제 `useRegions()` count 기반 `${count}개 지역`을 표시하고, 선택 후에는 `${selectedRegion.fullName}의 명소`를 표시한다.

## 화면 간 이동

| 출발 화면 | 이동 대상 |
| --- | --- |
| `LoginScreen` | `Terms`, `PrivacyPolicy` |
| `OnboardingScreen` | 온보딩 완료 후 AuthGate가 `MainTabs`로 재분기 |
| `MainScreen` | `HotLocalScreen`, `AdoptedPlaces`, `Notification`, `ChatRoom` |
| `MapScreen` | `AllRecommend` with `{ region: selectedRegion }`, `PostDetail` |
| `ChatRoomScreen` | `PostDetail`, `ResidentVerification`, OS 공유 시트 |
| `LocalPassScreen` | `Settings`, `PassHistory`, `ResidentVerification`, `Map` |
| `HotLocalScreen` | `ChatRoom`, 뒤로가기 |
| `AllRecommendScreen` | `PostDetail`, 뒤로가기 |
| `SettingsScreen` | `Terms`, `PrivacyPolicy`, AuthGate reset, 뒤로가기 |
| `ResidentVerificationScreen` | 인증 완료 후 뒤로가기 |
| 기타 stack 상세 화면 | 뒤로가기 |

## API 사용 참고

- `HotLocalScreen`: `GET /api/predictions/featured`를 `skipAuth: true`로 호출한다.
- `MapScreen`: 선택 지역 기준 `GET /api/places/adopted?regionCode=...`를 호출한다.
- `AdoptedPlacesScreen`: 사용자 거주지 기준 `GET /api/places/adopted?regionCode=...`를 호출한다.
- `AllRecommendScreen`: route param 지역 기준 `GET /api/places/adopted?regionCode=...`를 호출한다.
- `ChatRoomScreen`: `GET /api/posts`, `POST /api/posts`, `POST /api/posts/{postId}/like`를 사용한다. 단 `docs/api-endpoints.md`에는 게시글 목록/작성 API 상세가 별도 기재되어 있지 않다.
- `PostDetailScreen`: `GET /api/posts/{postId}/comments`, `POST /api/posts/{postId}/comments`, `POST /api/posts/{postId}/like`를 사용한다.
- `ResidentVerificationScreen`: `GET /api/auth/resident-status`, `POST /api/auth/resident-verify`를 사용한다.
- `LocalPassScreen`: `GET /api/local-pass/balance`, `GET /api/local-pass/history`, `POST /api/local-pass/use`를 사용한다. 이 local-pass API들은 현재 `docs/api-endpoints.md`에 별도 항목이 없다.
- `PassHistoryScreen`: `GET /api/local-pass/history`를 사용한다. 현재 `docs/api-endpoints.md`에는 별도 항목이 없다.

## 참고 사항

- `HotLocalScreen`은 탭 네비게이터 내부 route지만 `tabBarButton: () => null`로 탭바에서는 숨긴다.
- 요청에는 `KakaoMapView.js`가 언급되어 있으나 현재 코드에는 해당 파일이 없고 `NaverMapView.js`를 사용한다.
- 미연결 개발용 `frontend/src/screens/dev/DevScreen.js`는 제거됐다.
