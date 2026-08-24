# DB 스키마 점검 체크리스트

> 작성일: 2026-08-20
> 목적: `ddl-auto: update` 로 인해 엔티티와 운영 DB 스키마가 어긋나는 문제를 추적한다.

## 배경

Hibernate `ddl-auto: update` 는 **컬럼 추가만** 수행한다. 아래는 갱신하지 않는다.

- `NOT NULL` 제약 해제 (`ALTER COLUMN ... DROP NOT NULL`)
- enum 값 추가에 따른 `CHECK` 제약 갱신
- 컬럼·제약 삭제

따라서 엔티티에서 `nullable=false` 를 제거하거나 enum 에 상수를 추가해도
운영 DB 에는 옛 제약이 그대로 남아 런타임에 `ConstraintViolationException` 으로 터진다.
2026-08-20 하루에만 이 유형으로 세 번 막혔다.

## 발견 및 조치 이력 (2026-08-20)

| 테이블 | 항목 | 엔티티 정의 | 발견 시점 DB | 조치 |
|---|---|---|---|---|
| `users` | `nickname` | nullable | `NOT NULL` | `DROP NOT NULL` 적용 |
| `users` | `generation_tag` | nullable | `NOT NULL` | `DROP NOT NULL` 적용 |
| `localpass_histories` | `reason` CHECK | enum 6개 | 5개 (`SIGNUP_BONUS` 누락) | `DROP` + `ADD CONSTRAINT` |

`nickname` / `generation_tag` 는 가입 시점에 비어 있고 온보딩에서 채우는 설계다.
최초 테이블 생성 시점에는 `nullable=false` 였고, 이후 온보딩 분리 구조로
리팩토링하면서 엔티티에서만 제약이 빠졌다.

`SIGNUP_BONUS` 는 `LocalPassReason` enum 에 나중에 추가된 상수다.

## 전수 검토 결과

### nullable (10개 테이블)

`users` 2건 외 전부 일치. 나머지 8개 테이블 이상 없음.

`posts`, `post_images`, `adoptions`, `regions`, `localpass_histories`,
`monthly_region_indicators`, `prediction_results`, `resident_verifications`,
`weekly_visitor_stats`

`BaseTimeEntity` 의 `created_at` / `updated_at` (`nullable=false`) 도 전 테이블 일치.

### CHECK 제약 (4개)

| 테이블 | 컬럼 | 상태 |
|---|---|---|
| `localpass_histories` | `reason` | 불일치 → 수정 완료 |
| `posts` | `generation_tag` | 일치 |
| `regions` | `density_tier` | 일치 |
| `users` | `generation_tag` | 일치 |

## 9/17 DB 이전 시 실행할 SQL

무료 DB 만료(9/17)로 새 인스턴스에 스키마를 다시 만들 때,
`ddl-auto` 가 생성한 스키마와 현재 운영 스키마가 일치하는지 확인하고
아래를 적용한다.

```sql
-- users: 온보딩 전에는 비어 있어야 하는 컬럼
ALTER TABLE users ALTER COLUMN generation_tag DROP NOT NULL;
ALTER TABLE users ALTER COLUMN nickname DROP NOT NULL;

-- localpass_histories: enum 전체와 일치시킨다
ALTER TABLE localpass_histories DROP CONSTRAINT localpass_histories_reason_check;
ALTER TABLE localpass_histories ADD CONSTRAINT localpass_histories_reason_check
  CHECK (reason::text = ANY (ARRAY[
    'SIGNUP_BONUS',
    'POST_ADOPTED',
    'FIRST_POST_IN_REGION',
    'RESIDENT_VERIFIED',
    'ADOPTION_PARTICIPATED',
    'REWARD_EXCHANGED'
  ]::text[]));
```

## 점검용 쿼리

### 특정 테이블의 컬럼·제약 전체

```sql
\d 테이블명
```

### CHECK 제약 전체 목록

```sql
SELECT conname,
       conrelid::regclass AS table_name,
       pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'c'
  AND connamespace = 'public'::regnamespace
ORDER BY table_name, conname;
```

### 특정 제약 확인

```sql
SELECT pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'localpass_histories_reason_check';
```

### 운영 DB 접속

```bash
render psql dpg-da1u5tv40ujc738q63gg-a
```

psql 안에서는 **한 줄씩** 실행한다. 여러 줄을 한 번에 붙여넣으면
앞선 `\d` 같은 메타 명령이 뒷줄을 인자로 삼켜 조용히 무시된다.

## 재발 방지

엔티티에서 아래를 변경하면 **로컬과 운영 DB 양쪽에 수동 DDL 이 필요하다.**

- `@Column(nullable = ...)` 변경
- `@Enumerated(EnumType.STRING)` 컬럼의 enum 에 상수 추가·삭제
- 컬럼 삭제, 길이 축소

근본 해결은 Flyway 나 Liquibase 도입이지만 공모전 일정상 보류한다.
그 전까지는 위 변경을 할 때마다 이 문서를 갱신하고 SQL 을 추가한다.