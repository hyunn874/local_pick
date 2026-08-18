package com.localpick.backend.domain.prediction;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PredictionResultRepository extends JpaRepository<PredictionResult, Long> {

    List<PredictionResult> findAllByWeekStartDateOrderByRankingAsc(LocalDate weekStartDate);

    /** 순위 상위 N개. 홈 화면 TOP3 조회에 사용한다. */
    List<PredictionResult> findByWeekStartDateAndRankingLessThanEqualOrderByRankingAsc(
            LocalDate weekStartDate, int maxRanking);

    /** 가장 최근 예측이 돌아간 주. 프론트가 날짜를 모르고 호출할 때 기준이 된다. */
    @Query("select max(p.weekStartDate) from PredictionResult p")
    Optional<LocalDate> findLatestWeekStartDate();

    /** 이 주의 발굴 지역 3곳 */
    List<PredictionResult> findTop3ByWeekStartDateOrderByTotalScoreDesc(LocalDate weekStartDate);

    Optional<PredictionResult> findByRegionIdAndWeekStartDate(Long regionId, LocalDate weekStartDate);

    /** 특정 지역의 최근 추이 (예측 페이지 그래프용) */
    List<PredictionResult> findTop12ByRegionIdOrderByWeekStartDateDesc(Long regionId);

    boolean existsByWeekStartDate(LocalDate weekStartDate);
}
