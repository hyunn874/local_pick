# 로컬픽 프론트엔드 개발 로그

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
