# 로컬픽 프론트엔드 개발 로그

## 2026-08-18

### 완료한 작업
- Git 로컬 저장소 초기화 및 GitHub origin 연결
- `yeom` 브랜치를 `origin/yeom`에 연결
- AuthContext 기반 개발용 로그인 구조 추가
  - `AuthProvider`, `useAuth`, `devLogin`, `logout` 구성
  - SecureStore로 개발 로그인 상태 저장/복원 처리
- LoginScreen의 기존 bypass 로그인 흐름을 `devLogin()` 호출 방식으로 변경
- RootTabNavigator의 임시 로그인 state를 AuthContext 기반 분기로 교체
- 주요 화면의 더미 데이터를 `src/mocks` 파일들로 분리
- 로그인 유저 정보를 소통방/로컬패스 화면에 반영
- 로컬패스 화면에 로그아웃 버튼 추가
- 핫로컬 프론트 API 연결 준비
  - `predictionApi.js` 추가
  - HotLocalScreen을 API 성공 시 서버 데이터, 실패 시 mock 데이터 fallback 구조로 변경
- 백엔드 dev 방문자 API를 핫로컬 화면에 임시 연결
  - `/api/dev/visitors` 응답을 HotLocalScreen 표시 데이터로 변환
  - dev API 실패 시 운영 예상 API, 최종 실패 시 mock 데이터 사용
- 카카오 로그인 전 심사 방어 설정 정리
  - 카카오 로그인 미완성 상태에서는 버튼을 비활성 준비 상태로 표시
  - 개발 환경에서만 `개발용으로 시작하기` 버튼 노출
  - production 빌드에서 API 주소 미설정 시 localhost fallback 차단
  - iOS/Android 앱 식별자와 EAS 빌드 프로필 추가
  - 카카오 네이티브 플러그인은 실제 로그인 활성화 전까지 빌드 설정에서 제외
- Expo SDK 패치 버전 정리
  - `expo`, `expo-constants`를 SDK 54 기대 버전으로 업데이트
  - `expo-doctor` 18개 항목 통과 확인
- 배포 백엔드 URL 반영
  - `https://localpick-api.onrender.com` health/API 응답 확인
  - EAS preview/production 빌드 환경에 배포 API URL 추가
  - Render cold start를 고려해 API timeout 조정
  - HotLocalScreen의 dev visitor API 우선 호출은 production 환경에서 제외
- 배포 백엔드 기준 실제 지역 데이터 연결 강화
  - `/api/regions` 261개 응답 확인
  - MainScreen의 활성 지역 수를 실제 지역 개수 기반으로 표시
  - MainScreen 후보 지역을 실제 지역 목록 기반으로 표시
  - MapScreen 기본 선택 지역을 로그인 유저의 지역 코드와 백엔드 지역 목록 기준으로 설정
- 카카오 OAuth 프론트 로그인 연결
  - 백엔드 인증 엔드포인트 부재 확인
  - 프론트에서 카카오 OAuth access token과 사용자 프로필을 받아 AuthContext 세션으로 저장
  - 로컬 `.env`에서 카카오 로그인 버튼 활성화
  - Expo Go 테스트용으로 네이티브 카카오 SDK 플러그인 활성화 플래그 분리
- 카카오 로그인 백엔드 인증 계약 반영
  - 카카오 OAuth 결과를 프론트 토큰 교환이 아닌 인가코드 수신 방식으로 변경
  - `/api/auth/kakao`, `/api/auth/refresh`, `/api/users/me/onboarding`, `/api/users/me` API 함수 추가
  - AuthContext 저장 스키마에 `refreshToken`, `isOnboarded` 추가
  - 로그인 후 `isOnboarded` 값에 따라 로그인/온보딩/메인 탭 3단 분기 적용
  - 온보딩 화면 추가 및 닉네임/세대 태그 제출 API 연결
  - 온보딩 닉네임 2-12자 형식 검증과 400ms 디바운스 중복 확인 API 연결
  - apiClient에 Authorization 자동 첨부와 401 refresh 후 1회 재시도 흐름 추가
  - 네이티브 카카오 SDK 의존성 및 미사용 로그인 코드 제거

### 트러블슈팅
1. GitHub ZIP 다운로드본이라 `.git` 폴더가 없었음
   해결: `git init`, `origin` 등록, `origin/yeom` fetch 후 브랜치 연결

2. 다운로드본 파일과 `origin/yeom` 간 차이가 있었음
   해결: 기존 다운로드본 차이는 stash 백업 후 `origin/yeom` 기준으로 정리

3. Expo Doctor 패키지 버전 경고
   내용: `expo`, `expo-constants` 패치 버전이 SDK 기대값보다 낮음
   해결: `npx expo install expo@~54.0.37 expo-constants@~18.0.14` 실행

### 다음 작업
- EAS dev client 빌드에서 `localpick://auth/kakao` 리다이렉트 실제 동작 확인
- 백엔드 배포 서버의 `/api/auth/kakao`, `/api/auth/refresh`, `/api/users/me/onboarding` 실제 응답으로 로그인 플로우 검증
- MainScreen의 이 주의 발굴 지역을 `predictionApi` 흐름에 연결
- Apple 로그인 도입 범위 확정 및 백엔드 인증 API 계약 정리
- 게시글/로컬패스 API 함수 골격 추가
- 공통 로딩/에러/빈 상태 UI 컴포넌트 정리
- 지도/홈 화면에도 로그인 유저의 지역 정보 반영

## 2026-08-12

### 완료한 작업
- 5개 화면 기본 구현 (메인/소통방/지도/핫로컬TOP3/내 로컬패스)
- 5개 화면 UX 개선 (버튼 연결, 빈 상태, 접근성, 애니메이션)
- 패키지 4종 적용
  - @expo/vector-icons: 탭바 아이콘 Ionicons 교체
  - react-native-reanimated: 애니메이션 전면 교체
  - expo-haptics: 진동 피드백 추가
  - expo-image: 이미지 로딩 개선
- 알림 버튼 현대 디자인으로 교체 (뱃지형)

### 트러블슈팅
1. expo-asset 누락 에러
   원인: expo-image 설치 후 expo-asset 의존성 누락
   해결: npx expo install expo-asset 실행

2. React Hook 순서 경고
   원인: HotLocalScreen, MapScreen에서
         Reanimated hook이 조건부 렌더링 안에 있었음
   해결: hook을 부모 컴포넌트 상단으로 이동

3. SafeAreaView deprecated 경고
   원인: react-native 기본 SafeAreaView 사용
   해결: react-native-safe-area-context로 전체 교체
         App.js에 SafeAreaProvider 추가

### 내일 할 것
- 카카오 로그인 SDK 세팅
- 카카오 Reverse Geocoding 클라이언트 처리 구현
