package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 지역별 관광 소비 강도 (areaTarExpDsList) 한 건.
 *
 * 지표 코드
 *   2201 외지인 소비액
 *   2202 전체 대비 외지인 소비액 비중
 *   2203 방문량 대비 방문 소비액   ← 1인당 얼마 쓰는가
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record ExpenseIntensityItem(
        String baseYm,
        String areaCd,
        String areaNm,
        String signguCd,
        String signguNm,
        String tarExpDsIxCd,
        String tarExpDsIxNm,
        String tarExpDsIxVal
) {

    public static final String IX_OUTSIDER_AMOUNT = "2201";
    public static final String IX_OUTSIDER_RATIO = "2202";
    public static final String IX_PER_VISITOR = "2203";

    public double value() {
        if (tarExpDsIxVal == null || tarExpDsIxVal.isBlank()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(tarExpDsIxVal.trim());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    public boolean hasValidRegion() {
        return signguCd != null && signguCd.length() == 5;
    }
}
