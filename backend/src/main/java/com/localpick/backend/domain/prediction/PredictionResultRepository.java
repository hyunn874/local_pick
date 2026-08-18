package com.localpick.backend.domain.prediction;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PredictionResultRepository extends JpaRepository<PredictionResult, Long> {

    /**
     * 특정 주 전체 순위 — region join fetch.
     * region 이 LAZY 라 트랜잭션 밖에서 접근하면 LazyInitializationException 이 난다.
     * JPQL join fetch 로 한 번에 당겨 N+1 도 방지한다.
     */
    @Query("""
            select p from PredictionResult p
            join fetch p.region
            where p.weekStartDate = :weekStartDate
            order by p.ranking asc
            """)
    List<PredictionResult> findAllWithRegionByWeekStartDate(@Param("weekStartDate") LocalDate weekStartDate);

    /**
     * 순위 상위 N개 — region join fetch.
     * 홈 화면 TOP3, 예측 페이지 상위 조회에 공용으로 쓴다.
     */
    @Query("""
            select p from PredictionResult p
            join fetch p.region
            where p.weekStartDate = :weekStartDate and p.ranking <= :maxRanking
            order by p.ranking asc
            """)
    List<PredictionResult> findTopWithRegionByWeekStartDate(
            @Param("weekStartDate") LocalDate weekStartDate,
            @Param("maxRanking") int maxRanking);

    /** 가장 최근 예측이 돌아간 주. 프론트가 날짜를 모르고 호출할 때 기준이 된다. */
    @Query("select max(p.weekStartDate) from PredictionResult p")
    Optional<LocalDate> findLatestWeekStartDate();

    Optional<PredictionResult> findByRegionIdAndWeekStartDate(Long regionId, LocalDate weekStartDate);

    /** 특정 지역의 최근 추이 (예측 페이지 그래프용) */
    List<PredictionResult> findTop12ByRegionIdOrderByWeekStartDateDesc(Long regionId);

    boolean existsByWeekStartDate(LocalDate weekStartDate);
}
