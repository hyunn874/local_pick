package com.localpick.backend.domain.indicator;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface MonthlyRegionIndicatorRepository extends JpaRepository<MonthlyRegionIndicator, Long> {

    Optional<MonthlyRegionIndicator> findByRegionIdAndBaseYm(Long regionId, LocalDate baseYm);

    /** 예측 알고리즘 입력 — 해당 월 전국 지표 */
    List<MonthlyRegionIndicator> findAllByBaseYm(LocalDate baseYm);

    long countByBaseYm(LocalDate baseYm);

    /**
     * 기준일이 속한 월 이하에서 수집이 끝난 가장 최신 월.
     * 공사 월간 지표는 두세 달 지연되어 공개되므로 "그 주의 월"이 없는 것이 정상이다.
     */
    @Query("select max(i.baseYm) from MonthlyRegionIndicator i where i.baseYm <= :upperBound")
    Optional<LocalDate> findLatestBaseYmNotAfter(LocalDate upperBound);

    @Query("select max(i.baseYm) from MonthlyRegionIndicator i")
    Optional<LocalDate> findLatestBaseYm();
}
