package com.localpick.backend.domain.visitor;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WeeklyVisitorStatRepository extends JpaRepository<WeeklyVisitorStat, Long> {

    Optional<WeeklyVisitorStat> findByRegionIdAndWeekStartDate(Long regionId, LocalDate weekStartDate);

    /** 예측 알고리즘 입력 — 해당 주 전국 집계 */
    List<WeeklyVisitorStat> findAllByWeekStartDate(LocalDate weekStartDate);

    /** 특정 지역의 최근 추이 */
    List<WeeklyVisitorStat> findTop12ByRegionIdOrderByWeekStartDateDesc(Long regionId);

    boolean existsByWeekStartDate(LocalDate weekStartDate);

    long countByWeekStartDate(LocalDate weekStartDate);
}
