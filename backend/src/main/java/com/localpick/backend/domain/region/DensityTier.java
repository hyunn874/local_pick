package com.localpick.backend.domain.region;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 인구밀도 구간별 채택 임계값 등급.
 *
 * 로컬패스 보상 금액은 지역에 관계없이 동일하게 유지하고,
 * 채택에 필요한 추천 수(임계값)만 인구밀도에 따라 낮춘다.
 * 인구가 적은 지역에서 채택이 사실상 불가능해지는 문제를 막기 위한 장치.
 */
@Getter
@RequiredArgsConstructor
public enum DensityTier {

    VERY_LOW(3),
    LOW(5),
    MEDIUM(8),
    HIGH(12);

    /** 채택 확정에 필요한 추천 수 */
    private final int adoptionThreshold;

    /** 인구밀도(명/km²) 기준으로 등급을 판정한다. */
    public static DensityTier of(double densityPerSquareKm) {
        if (densityPerSquareKm < 100) {
            return VERY_LOW;
        }
        if (densityPerSquareKm < 1000) {
            return LOW;
        }
        if (densityPerSquareKm < 5000) {
            return MEDIUM;
        }
        return HIGH;
    }
}
