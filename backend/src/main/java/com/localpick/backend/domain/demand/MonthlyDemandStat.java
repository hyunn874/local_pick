package com.localpick.backend.domain.demand;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 지역별 월간 관광 수요 강도 / 다양성 원지표.
 *
 * 방문자수(일 단위)와 달리 수요강도·다양성 API 는 월 단위(baseYm)로만 내려온다.
 * 시간축을 맞추기 위해 "그 주가 속한 달"의 값을 예측에 끌어다 쓴다.
 * 덕분에 이 지표들은 매주가 아니라 월 1회만 수집하면 된다.
 *
 * 파생 점수(0~100)는 저장하지 않고 원지표만 남긴다.
 * 정규화는 전국 분포를 봐야 가능하고, 가중치가 바뀌면 재계산이 필요하기 때문이다.
 */
@Entity
@Getter
@Table(
        name = "monthly_demand_stats",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_demand_region_month",
                columnNames = {"region_id", "baseYm"}),
        indexes = @Index(name = "idx_demand_month", columnList = "baseYm")
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MonthlyDemandStat extends BaseTimeEntity {

    /** 연령 구간 개수 (10대~60대). 다양성 균등도의 분모. */
    private static final int AGE_BUCKETS = 6;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    /** yyyyMM */
    @Column(nullable = false, length = 6)
    private String baseYm;

    // ---------- 수요 강도 (35%) ----------

    /** 2101 타권역 방문자 비중 */
    private Double outsiderRatio;

    /** 2102 숙박 비중 — 머무는가, 스쳐가는가 */
    private Double lodgingRatio;

    /** 2203 방문량 대비 방문 소비액 — 1인당 소비 */
    private Double expensePerVisitor;

    // ---------- 다양성 (25%) ----------

    private Double teens;
    private Double twenties;
    private Double thirties;
    private Double forties;
    private Double fifties;
    private Double sixties;

    @Builder
    private MonthlyDemandStat(Region region, String baseYm) {
        this.region = region;
        this.baseYm = baseYm;
    }

    public void updateStay(Double outsiderRatio, Double lodgingRatio) {
        if (outsiderRatio != null) this.outsiderRatio = outsiderRatio;
        if (lodgingRatio != null) this.lodgingRatio = lodgingRatio;
    }

    public void updateExpense(Double expensePerVisitor) {
        if (expensePerVisitor != null) this.expensePerVisitor = expensePerVisitor;
    }

    public void updateAge(String indexCode, double value) {
        switch (indexCode) {
            case "3101" -> this.teens = value;
            case "3102" -> this.twenties = value;
            case "3103" -> this.thirties = value;
            case "3104" -> this.forties = value;
            case "3105" -> this.fifties = value;
            case "3106" -> this.sixties = value;
            default -> { /* 알 수 없는 지표는 무시 */ }
        }
    }

    /**
     * 체류 강도. 외지인 비중과 숙박 비중의 평균.
     * 둘 다 "관광지로서 얼마나 소비되는가"를 보여주므로 동등 가중한다.
     */
    public Double stayIntensity() {
        if (outsiderRatio == null && lodgingRatio == null) return null;
        if (outsiderRatio == null) return lodgingRatio;
        if (lodgingRatio == null) return outsiderRatio;
        return (outsiderRatio + lodgingRatio) / 2.0;
    }

    public Double expenseIntensity() {
        return expensePerVisitor;
    }

    /**
     * 연령 균등도 (0~1). 섬넘 엔트로피를 log(6) 으로 나눈 값.
     *
     * 1에 가까울수록 모든 연령대가 고르게 찾는 지역이고,
     * 0에 가까울수록 특정 세대만 오는 지역이다.
     * 로컬픽은 후자를 "관광 다양성이 낮다"고 본다.
     */
    public Double ageEvenness() {
        double[] counts = {
                nz(teens), nz(twenties), nz(thirties),
                nz(forties), nz(fifties), nz(sixties)
        };
        double total = 0;
        for (double c : counts) total += c;
        if (total <= 0) return null;

        double entropy = 0;
        for (double c : counts) {
            if (c <= 0) continue;
            double p = c / total;
            entropy -= p * Math.log(p);
        }
        return entropy / Math.log(AGE_BUCKETS);
    }

    /** 수요·다양성 어느 쪽도 채우지 못한 껍데기 행인지 */
    public boolean isEmpty() {
        return stayIntensity() == null && expenseIntensity() == null && ageEvenness() == null;
    }

    private static double nz(Double v) {
        return v == null ? 0.0 : v;
    }
}
