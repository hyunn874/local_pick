package com.localpick.backend.domain.visitor;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 지역별 주간 방문자수 집계.
 *
 * 공사 API 는 일 단위로 내려오지만(하루 전국 약 772건), 예측이 주 단위이므로
 * 주간 합계만 저장한다. 원본을 모두 보관하면 주당 5천여 건이 쌓여 무료 DB 용량에
 * 부담이 되고, 활용처도 없다.
 *
 * 관광객 구분별로 나눠 저장하는 이유:
 * 소외도 산정에는 외지인만 사용하지만, 현지인 대비 외지인 비율이
 * 관광 의존도를 보여주는 보조 지표가 될 수 있어 함께 남긴다.
 */
@Entity
@Getter
@Table(
        name = "weekly_visitor_stats",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_visitor_region_week",
                columnNames = {"region_id", "weekStartDate"}),
        indexes = @Index(name = "idx_visitor_week", columnList = "weekStartDate")
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WeeklyVisitorStat extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    /** 해당 주의 월요일 */
    @Column(nullable = false)
    private LocalDate weekStartDate;

    /** 외지인 방문자수 합계 — 관광 소외도 산정의 기준 */
    @Column(nullable = false)
    private double outsiderCount;

    /** 현지인 방문자수 합계 */
    @Column(nullable = false)
    private double localCount;

    /** 외국인 방문자수 합계 */
    @Column(nullable = false)
    private double foreignerCount;

    /** 집계에 사용된 일수 (데이터 누락 판단용) */
    @Column(nullable = false)
    private int dayCount;

    @Builder
    private WeeklyVisitorStat(Region region, LocalDate weekStartDate,
                              double outsiderCount, double localCount,
                              double foreignerCount, int dayCount) {
        this.region = region;
        this.weekStartDate = weekStartDate;
        this.outsiderCount = outsiderCount;
        this.localCount = localCount;
        this.foreignerCount = foreignerCount;
        this.dayCount = dayCount;
    }

    public void update(double outsiderCount, double localCount,
                       double foreignerCount, int dayCount) {
        this.outsiderCount = outsiderCount;
        this.localCount = localCount;
        this.foreignerCount = foreignerCount;
        this.dayCount = dayCount;
    }

    /** 전체 방문자 중 외지인 비율. 관광 의존도 보조 지표. */
    public double outsiderRatio() {
        double total = outsiderCount + localCount + foreignerCount;
        return total > 0 ? outsiderCount / total : 0.0;
    }

    /** 일평균 외지인 방문자수. 조회 일수가 다른 주끼리 비교할 때 사용한다. */
    public double dailyAverageOutsider() {
        return dayCount > 0 ? outsiderCount / dayCount : 0.0;
    }

    public boolean isComplete() {
        return dayCount >= 7;
    }
}
