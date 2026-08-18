package com.localpick.backend.domain.indicator;

/**
 * 한 지역·한 달치 지표를 DB 에 쓰기 직전 형태로 모아 둔 값 객체.
 *
 * 공사 API 호출(수백 건, 수 분)과 DB 쓰기를 분리하기 위해 존재한다.
 * Render 무료 Postgres 는 커넥션이 5개뿐이라, HTTP 를 기다리는 동안
 * 트랜잭션을 열어 두면 커넥션 하나를 통째로 묶어 두게 된다.
 */
public record RegionIndicatorSnapshot(
        String regionCode,
        Double outsiderVisitRatio,
        Double lodgingRatio,
        Double expensePerVisitor,
        Double ageEvenness,
        Double ageSampleTotal
) {
}
