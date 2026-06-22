# Backend (창현 담당)

Spring Boot (Java) + MySQL

## 폴더 구조 (예정)

```
backend/
├── src/main/java/com/localpick/
│   ├── auth/          # 거주자 인증 (소셜로그인, GPS 검증)
│   ├── community/      # 지역 소통방 (게시물, 좋아요·댓글·공유, 채택 로직)
│   ├── map/             # 지도 페이지 (채택 명소, 대안 추천)
│   ├── algorithm/       # 지역 관광 균등화 예측 알고리즘
│   ├── api/             # 한국관광공사 OpenAPI 연동 클라이언트
│   └── pass/            # 로컬패스 지급·사용 로직
└── src/main/resources/
    └── application.yml
```

## 환경변수 (.env 또는 application-secret.yml, git에 커밋 금지)

```
KTO_API_KEY=
KAKAO_REST_API_KEY=
DB_URL=
DB_USERNAME=
DB_PASSWORD=
```

## 담당 기능

- [ ] 거주자 인증 로직 (가입 시 거주지 입력 → 게시물 업로드 시 GPS 검증 → 7일 내 3회 → 배지)
- [ ] 한국관광공사 OpenAPI 6종 연동 (관광빅데이터, 수요강도, 다양성지수, 연관관광지, 국문관광정보, 관광사진)
- [ ] 카카오 Reverse Geocoding 연동 (좌표 → 행정구역 변환)
- [ ] 지역 관광 균등화 예측 알고리즘 (가중치 40/35/25%)
- [ ] 채택 시스템 (좋아요·댓글·공유 기준 자동 판정)
- [ ] 로컬패스 지급·차감 로직
