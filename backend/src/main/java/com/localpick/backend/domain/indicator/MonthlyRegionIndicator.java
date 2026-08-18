package com.localpick.backend.domain.indicator;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.YearMonth;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 지역별 월간 관광 지표 (수요 강도 35% + 다양성 25% 의 원천).
 *
 * 방문자수는 일 단위라 주간 집계가 가능하지만, 수요 강도와 다양성은 공사가 월 단위
 * (baseYm)로만 제공한다. 주 단위 예측에 월 단위 지표를 억지로 쪼개면 없는 정밀도를
 * 만들어내는 셈이므로, 월 값을 그대로 저장하고 예측 시점에 "그 주가 속한 월 이하의
 * 가장 최신 월"을 붙이는 방식을 쓴다. 어느 월 데이터를 썼는지는 PredictionResult 에
 * 기록해 화면에서 밝힌다.
 *
 * 원본 지표를 그대로 두지 않고 지역·월당 한 행으로 접어 저장하는 이유는 방문자수와
 * 같다. 무료 DB 용량 보호.
 *
 * 값이 null 인 것과 0 인 것은 의미가 다르다. null 은 공사 응답에 해당 지역이
 * 없었다는 뜻이고, 예측에서는 중립값으로 처리된다.
 */
@Entity
@Getter
@Table(
        name = "monthly_region_indicators",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_indicator_region_month",
                columnNames = {"region_id", "baseYm"}),
        indexes = @Index(name = "idx_indicator_month", columnList = "baseYm")
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MonthlyRegionIndicator extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    /** 기준 월의 1일. YearMonth 는 JPA 기본 매핑이 없어 LocalDate 로 저장한다. */
    @Column(nullable = false)
    private LocalDate baseYm;

    // ---------- 수요 강도 (35%) ----------

    /** 2101 타권역 방문자 비중 — 외지인이 얼마나 찾아오는가 */
    private Double outsiderVisitRatio;

    /** 2102 숙박 비중 — 머무는가, 스쳐가는가 */
    private Double lodgingRatio;

    /** 2203 방문량 대비 방문 소비액 — 1인당 얼마 쓰는가 */
    private Double expensePerVisitor;

    // ---------- 다양성 (25%) ----------

    /**
     * 연령 분포의 균등도 (0~1). 섀넌 엔트로피를 ln(6) 으로 나눈 값.
     * 1 에 가까울수록 전 연령대가 고르게 방문한다는 뜻이고,
     * 0 에 가까울수록 특정 연령대에 쏠려 있다는 뜻이다.
     */
    private Double ageEvenness;

    /** 균등도 계산에 쓰인 연령대 방문객 총합. 표본이 너무 작으면 균등도를 믿기 어렵다. */
    private Double ageSampleTotal;

    @Builder
    private MonthlyRegionIndicator(Region region, LocalDate baseYm) {
        this.region = region;
        this.baseYm = baseYm;
    }

    public static LocalDate toBaseYm(YearMonth month) {
        return month.atDay(1);
    }

    public YearMonth yearMonth() {
        return YearMonth.from(baseYm);
    }

    public void updateDemand(Double outsiderVisitRatio, Double lodgingRatio, Double expensePerVisitor) {
        this.outsiderVisitRatio = outsiderVisitRatio;
        this.lodgingRatio = lodgingRatio;
        this.expensePerVisitor = expensePerVisitor;
    }

    public void updateDiversity(Double ageEvenness, Double ageSampleTotal) {
        this.ageEvenness = ageEvenness;
        this.ageSampleTotal = ageSampleTotal;
    }

    /** 수요 강도 세 지표가 하나라도 있는가 */
    public boolean hasAnyDemand() {
        return outsiderVisitRatio != null || lodgingRatio != null || expensePerVisitor != null;
    }

    public boolean hasDiversity() {
        return ageEvenness != null;
    }
}
