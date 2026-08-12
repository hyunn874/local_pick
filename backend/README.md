# LocalPick Backend

2026 한국관광공사 관광데이터 활용 공모전 — 지역 관광 균등화 플랫폼

## 스택

- Java 22 / Spring Boot 3.5.x
- PostgreSQL
- Gradle (wrapper 포함)
- 배포: Render (Docker)

## 로컬 실행

```bash
# 1. DB 준비
brew services start postgresql@14
createdb localpick

# 2. 설정 파일 복사 후 값 입력
cd backend/src/main/resources
cp application-local.yml.example application-local.yml

# 3. 실행
cd ../../../..
./gradlew bootRun
```

확인:
- http://localhost:8080/actuator/health → `{"status":"UP"}`
- http://localhost:8080/api/ping

## 패키지 구조

```
com.localpick.backend
├── global/
│   ├── config/          CORS, RestClient
│   ├── controller/      헬스체크
│   ├── entity/          BaseTimeEntity (생성/수정 시각 자동 기록)
│   ├── exception/       ErrorCode, BusinessException, 전역 핸들러
│   └── response/        ApiResponse<T> 공통 래퍼
├── domain/
│   ├── user/            회원, 세대 태그
│   ├── region/          행정구역 마스터, 인구밀도 등급
│   ├── verification/    거주자 인증 (7일 3회 체크인)
│   ├── post/            소통방 게시글, 채택
│   ├── localpass/       로컬패스 적립/사용 이력
│   └── prediction/      주간 소외지역 예측 결과
└── infra/external/      공사·행안부 API 클라이언트
```

## 위치정보 처리 원칙 (필독)

GPS 좌표는 **절대 서버로 전송하지 않는다.**

앱(클라이언트)에서 카카오 Reverse Geocoding 을 직접 호출해 행정구역 텍스트로
변환하고, 서버에는 지역코드만 보낸다. 위치기반서비스 사업자 신고 의무를
피하기 위한 설계 제약이므로 개발 전 기간 유지한다. 지도 페이지도 "내 주변"이
아니라 **지역 선택형**으로 구현한다.

`Post.latitude/longitude` 는 예외다. 이는 사용자의 위치가 아니라 사용자가
지도에서 직접 지정한 **제보 장소**의 좌표이므로 개인위치정보에 해당하지 않는다.

## 예측 알고리즘

주 1회 배치로 계산한다.

| 지표 | 출처 | 가중치 |
|---|---|---|
| 지역별 방문자수 | 공사 빅데이터_방문자수_GW | 40% |
| 관광 수요 강도 | 공사 빅데이터 | 35% |
| 관광 다양성 | 공사 빅데이터 | 25% |

각 지표를 0~100 으로 **역방향 정규화**(소외될수록 높은 점수)한 뒤 가중 합산하고,
상위 3개 지역을 '이 주의 발굴 지역'으로 노출한다.

## 로컬패스 정책

보상 금액은 전 지역 동일하다. 지역 간 차이는 **채택 임계값**으로만 조정한다.
인구가 적은 지역에서 채택이 사실상 불가능해지는 것을 막기 위한 설계다.

| 인구밀도(명/km²) | 등급 | 채택 필요 추천 수 |
|---|---|---|
| < 100 | VERY_LOW | 3 |
| < 1,000 | LOW | 5 |
| < 5,000 | MEDIUM | 8 |
| ≥ 5,000 | HIGH | 12 |

## 주의사항

- `application-local.yml` 은 커밋하지 않는다. 공사 인증키가 들어간다.
- `ddl-auto` 는 시드 콘텐츠 작업(4주차) 전에 `validate` 로 바꾸고 스키마를 SQL 로 관리한다.
- 로컬패스 잔액(`User.localPassBalance`) 변경은 반드시 `LocalPassHistory` 기록과
  같은 트랜잭션에서 처리한다.
