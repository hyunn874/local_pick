package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 지역별 관광 체류 강도 (areaTarSjrnDsList) 한 건.
 *
 * 지표 코드
 *   2101 타권역 방문자 비중  ← 외지인이 얼마나 오는가
 *   2102 숙박 비중          ← 머무는가, 스쳐가는가
 *   2103~2105 1/2/3박 방문자수
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record StayIntensityItem(
        String baseYm,
        String areaCd,
        String areaNm,
        String signguCd,
        String signguNm,
        String tarSjrnDsIxCd,
        String tarSjrnDsIxNm,
        String tarSjrnDsIxVal
) {

    public static final String IX_OUTSIDER_RATIO = "2101";
    public static final String IX_LODGING_RATIO = "2102";

    public double value() {
        if (tarSjrnDsIxVal == null || tarSjrnDsIxVal.isBlank()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(tarSjrnDsIxVal.trim());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    public boolean hasValidRegion() {
        return signguCd != null && signguCd.length() == 5;
    }
}
