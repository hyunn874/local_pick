# 로컬픽 (LocalPick)

2026 한국관광공사 관광데이터 활용 공모전 출품작. 관광 소외 지역 균등화 플랫폼.
창현(백엔드) + 대협(프론트) 2인 팀.

## 구조
- `backend/` Spring Boot 3.5.4 + PostgreSQL + Gradle 8.14, Render 배포
- `frontend/` React Native Expo
- `docs/` 기획 문서

## 하드 제약 (절대 위반 금지)
- GPS 좌표는 이용자 위치 권한 동의 후 거주자 인증 목적에만 사용한다.
  서버에서 네이버 Reverse Geocoding으로 행정구역을 확인하되, 원본 좌표는 저장하지 않는다.
- 로컬패스 보상액은 전 지역 동일. 지역차는 채택 임계값(DensityTier)으로만 준다.
- 방문자수는 외지인(touDivCd=2)만 사용한다.
- 원본 API 응답을 저장하지 않는다. 무료 DB 용량 한계로 집계만 저장한다.

## 예측 알고리즘
방문자수 40% + 수요강도 35% + 다양성 25%. 세 지표 모두 역방향 정규화(소외될수록 고점).
- 방문자수: 일 단위 → 주간 집계 (WeeklyVisitorStat)
- 수요강도/다양성: 월 단위 → 월간 테이블 (MonthlyDemandStat), 그 주가 속한 달 값을 사용
- 정규화는 백분위 순위. min-max는 서울 극단값 때문에 쓰지 않는다.

## 컨벤션
- 도메인별 패키지 (`domain/{region,visitor,demand,prediction,post,user,...}`)
- 응답은 `ApiResponse` 래퍼, 예외는 `BusinessException` + `ErrorCode`
- 엔티티는 `@NoArgsConstructor(access = PROTECTED)` + `@Builder` (private 생성자)
- open-in-view: false. LAZY 연관은 트랜잭션 안에서 DTO로 변환해 반환한다.
- 주석은 한국어. "무엇을"이 아니라 "왜 이렇게 했는지"를 쓴다.
- dev용 컨트롤러는 `@Profile("local")`

## 빌드
`cd backend && ./gradlew compileJava`
