# LocalPick Frontend

React Native와 Expo로 만든 로컬픽 앱입니다. 거주자가 동네 명소를 공유하고, 채택된 장소와 로컬패스를 확인할 수 있습니다.

## 시작하기

```bash
npm install
npm run start
```

플랫폼별 실행 명령:

```bash
npm run ios
npm run android
npm run web
```

`npm run ios`와 `npm run android`는 네이티브 모듈이 포함된 개발 빌드가 필요합니다. 네이버 지도는 Expo Go만으로는 동작이 제한될 수 있습니다.

## 환경변수

`.env.example`을 복사해 `.env`를 만들고 실행 환경에 맞는 값을 입력합니다.

| 변수 | 용도 |
| --- | --- |
| `EXPO_PUBLIC_APP_ENV` | `development`, `preview`, `production` 실행 환경 |
| `EXPO_PUBLIC_API_BASE_URL` | 백엔드 API 주소. 기본값은 `https://localpick-api.fly.dev` |
| `EXPO_PUBLIC_ENABLE_KAKAO_LOGIN` | 카카오 로그인 버튼 활성화 여부 |
| `EXPO_PUBLIC_KAKAO_REST_API_KEY` | 카카오 로그인 및 거주자 인증 Reverse Geocoding |
| `EXPO_PUBLIC_KAKAO_REDIRECT_URI` | 카카오 개발자 콘솔에 등록한 앱 redirect URI |
| `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` | 네이버 지도 네이티브 모듈 Client ID |

키와 토큰이 들어 있는 `.env`는 저장소에 커밋하지 않습니다. 공개 빌드에 필요한 값은 EAS 또는 배포 환경의 비밀 변수로 관리합니다.

## 주요 사용자 흐름

- 로그인: 카카오 로그인, iOS Apple 로그인, 로그인 없이 둘러보기
- 온보딩: 닉네임 확인 → 세대 선택 → 메인 화면
- 홈: 핫로컬, 채택 명소, 알림으로 이동
- 지도: 지역 선택 → 지역별 지도 중심 이동 → 채택 명소 마커와 추천 확인
- 소통방: 지역 게시글 조회, 명소 공유, 좋아요, 댓글, 채택 투표
- 로컬패스: 잔액·사용 이력 조회 및 명소 열람
- 설정: 이용약관, 개인정보처리방침, 로그아웃, 회원탈퇴

## 프로젝트 구조

```text
frontend/
├── App.js
├── app.config.js            # Expo 앱, 권한, 환경변수 기반 네이티브 플러그인 설정
├── src/
│   ├── api/                 # 백엔드 및 외부 API 클라이언트
│   ├── components/          # 공통 UI와 네이버 지도 컴포넌트
│   ├── contexts/            # AuthContext
│   ├── data/                # 지역별 지도 좌표 데이터
│   ├── hooks/               # 지역 목록 등 커스텀 hook
│   ├── mocks/               # API 실패 시 화면 유지용 mock 데이터
│   ├── navigation/          # Stack 및 Bottom Tab 네비게이션
│   ├── screens/             # 앱 화면
│   └── state/               # 로컬패스, 좋아요, 댓글, 게시글 진행 상태
├── docs/
│   ├── api-integration.md   # API 연동 현황과 폴백
│   ├── screens.md           # 화면 및 네비게이션 구조
│   └── state.md             # 전역 상태 구조
└── assets/
```

## 네비게이션

`src/navigation/RootTabNavigator.js`가 인증 분기와 전체 네비게이션을 관리합니다.

- 인증 전: `LoginScreen`
- 로그인 후 미완료 상태: `OnboardingScreen`
- 온보딩 완료 후: 홈, 지도, 소통방, 로컬패스 Bottom Tab
- 상세 화면: 게시글, 채택 명소, 로컬패스 내역, 거주자 인증, 설정, 약관

게스트는 홈·지도·핫로컬을 이용할 수 있고, 소통방과 로컬패스 진입 시 로그인 안내를 받습니다.

## 지도

지도는 `@mj-studio/react-native-naver-map`을 사용합니다.

- `NaverMapView`는 `forwardRef`로 네이티브 지도 ref를 전달합니다.
- 지역 선택 시 `animateCameraTo`로 중심과 확대 수준을 변경합니다.
- 명소 좌표가 있으면 명소 중심, 없으면 지역 API 좌표와 `src/data/regionCoordinates.js`를 순서대로 사용합니다.
- 지역별 채택 명소 API 실패 시 mock 마커를 표시하지 않고 빈 지도로 유지합니다.

## 인증과 상태

`AuthContext`가 access token, refresh token, 사용자 정보, 온보딩 상태와 게스트 모드를 관리합니다. 401 응답이 발생하면 refresh token으로 한 번 갱신한 뒤 원래 요청을 재시도합니다.

`localPassStore`는 로그인 성공 및 로컬패스 화면 진입 시 서버 잔액을 동기화합니다. 좋아요·댓글 수와 내 게시글 진행률은 화면 간 이동을 위한 메모리 상태입니다.

## API 문서

백엔드 API 명세는 저장소 루트의 [`docs/api-endpoints.md`](../docs/api-endpoints.md)를 참고합니다.

- [`docs/api-integration.md`](docs/api-integration.md): 현재 연동·폴백·미연동 API
- [`docs/screens.md`](docs/screens.md): 화면별 진입 조건과 이동 구조
- [`docs/state.md`](docs/state.md): 전역 상태와 주요 함수

## 문제 해결

- API 연결 실패: `EXPO_PUBLIC_API_BASE_URL`과 네트워크 상태를 확인합니다.
- iOS 위치 인증 실패: 시뮬레이터 위치 설정 또는 실제 기기의 위치 권한을 확인합니다. Reverse Geocoding 실패 시 화면에서 지역을 직접 입력할 수 있습니다.
- 카카오 로그인 비활성: `EXPO_PUBLIC_ENABLE_KAKAO_LOGIN=true`와 REST API 키, redirect URI 설정을 확인합니다.
- 네이버 지도 미표시: Client ID 설정 후 네이티브 개발 빌드를 다시 생성합니다.
