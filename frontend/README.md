# LocalPick Frontend

React Native + Expo 앱입니다.

## 실행

```bash
npm install
npm run start
```

## 주요 구조

```text
frontend/
├── App.js
├── src/
│   ├── screens/              # 메인, 소통방, 지도, 내 로컬패스
│   ├── components/           # 공통 컴포넌트
│   ├── navigation/           # 하단 탭바 라우팅
│   ├── api/                  # 외부 API 호출
│   ├── hooks/                # 커스텀 훅
│   └── constants/            # 디자인 토큰
└── assets/
```

## 카카오 설정

`app.json`의 `expo.extra.kakao` 값을 채운 뒤 실행합니다.

```json
{
  "restApiKey": "카카오 REST API 키",
  "javascriptKey": "카카오 JavaScript 키",
  "redirectUri": "localpick://auth/kakao"
}
```

카카오맵은 현재 Expo Go에서도 확인하기 쉬운 WebView 기반 구조로 준비되어 있습니다.
