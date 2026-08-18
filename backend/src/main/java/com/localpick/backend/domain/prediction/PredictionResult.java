package com.localpick.backend.domain.prediction;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 주간 관광 소외 지역 예측 결과.
 *
 * 공사 빅데이터 API 3종을 가중 합산한다.
 *   방문자수 40% + 관광 수요 강도 35% + 관광 다양성 25%
 *
 * 각 지표는 0~100 으로 정규화하되, "소외될수록 높은 점수"가 되도록 역방향으로 만든다.
 * (방문자가 적을수록 visitorScore 가 높다)
 */
@Entity
@Getter
@Table(
        name = "prediction_results",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_prediction_region_week",
                columnNames = {"region_id", "weekStartDate"}),
        indexes = @Index(name = "idx_prediction_week_rank", columnList = "weekStartDate, ranking")
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PredictionResult extends BaseTimeEntity {

    public static final double WEIGHT_VISITOR = 0.40;
    public static final double WEIGHT_DEMAND = 0.35;
    public static final double WEIGHT_DIVERSITY = 0.25;

    /** 이 주의 발굴 지역으로 노출할 개수 */
    public static final int FEATURED_COUNT = 3;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    /** 해당 주의 월요일 */
    @Column(nullable = false)
    private LocalDate weekStartDate;

    /**
     * 이 예측에 사용된 월간 지표(수요 강도·다양성)의 기준 월 1일.
     *
     * 방문자수는 주 단위, 나머지 두 지표는 월 단위라 시간축이 어긋난다. 공사 월간
     * 지표는 두세 달 지연 공개되므로 "그 주가 속한 월" 데이터는 대개 아직 없다.
     * 어느 시점 데이터를 붙였는지 숨기지 않고 남겨 화면에서 함께 밝힌다.
     * 월간 지표가 하나도 없으면 null 이고, 이때 두 지표는 중립 50점으로 계산된다.
     */
    private LocalDate indicatorBaseYm;

    /** 방문자수 기반 점수 (0~100, 방문자가 적을수록 높음) */
    @Column(nullable = false)
    private double visitorScore;

    /** 관광 수요 강도 기반 점수 (0~100) */
    @Column(nullable = false)
    private double demandScore;

    /** 관광 다양성 기반 점수 (0~100) */
    @Column(nullable = false)
    private double diversityScore;

    /** 가중 합산 총점 (0~100). 높을수록 소외도가 크다. */
    @Column(nullable = false)
    private double totalScore;

    /** 전국 순위. 1~3위가 '이 주의 발굴 지역'. rank 는 SQL 예약어라 ranking 으로 매핑한다. */
    @Column(name = "ranking", nullable = false)
    private int ranking;

    @Builder
    private PredictionResult(Region region, LocalDate weekStartDate, LocalDate indicatorBaseYm,
                             double visitorScore, double demandScore, double diversityScore) {
        this.region = region;
        this.weekStartDate = weekStartDate;
        this.indicatorBaseYm = indicatorBaseYm;
        this.visitorScore = visitorScore;
        this.demandScore = demandScore;
        this.diversityScore = diversityScore;
        this.totalScore = calculateTotal(visitorScore, demandScore, diversityScore);
        this.ranking = 0;
    }

    public static double calculateTotal(double visitor, double demand, double diversity) {
        return visitor * WEIGHT_VISITOR
                + demand * WEIGHT_DEMAND
                + diversity * WEIGHT_DIVERSITY;
    }

    public void assignRanking(int ranking) {
        this.ranking = ranking;
    }

    /** 재계산 시 점수를 갱신한다. 같은 주를 다시 돌려도 행이 늘지 않도록. */
    public void updateScores(LocalDate indicatorBaseYm,
                             double visitorScore, double demandScore, double diversityScore) {
        this.indicatorBaseYm = indicatorBaseYm;
        this.visitorScore = visitorScore;
        this.demandScore = demandScore;
        this.diversityScore = diversityScore;
        this.totalScore = calculateTotal(visitorScore, demandScore, diversityScore);
    }

    public boolean isFeatured() {
        return ranking >= 1 && ranking <= FEATURED_COUNT;
    }
}
