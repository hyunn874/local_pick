package com.localpick.backend.domain.demand;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MonthlyDemandStatRepository extends JpaRepository<MonthlyDemandStat, Long> {

    Optional<MonthlyDemandStat> findByRegionIdAndBaseYm(Long regionId, String baseYm);

    List<MonthlyDemandStat> findAllByBaseYm(String baseYm);

    /** 요청한 달의 데이터가 아직 없을 때 그 이전 최신 달로 폴백 */
    @Query("select max(d.baseYm) from MonthlyDemandStat d where d.baseYm <= :baseYm")
    Optional<String> findLatestBaseYmNotAfter(@Param("baseYm") String baseYm);

    long countByBaseYm(String baseYm);
}
