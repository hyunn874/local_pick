package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 지역별 관광객 다양성 (areaTouDivList) 한 건.
 *
 * 지표 코드 — 연령대별 방문객수
 *   3101 10대  3102 20대  3103 30대
 *   3104 40대  3105 50대  3106 60대
 *
 * 로컬픽의 세대 태그(20대 / 30·40대 / 50대 이상)와 대응된다.
 * 연령 분포가 한쪽으로 쏠릴수록 관광 다양성이 낮다고 본다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record TouristDiversityItem(
        String baseYm,
        String areaCd,
        String areaNm,
        String signguCd,
        String signguNm,
        String touDivIxCd,
        String touDivIxNm,
        String touDivIxVal
) {

    public static final String IX_TEENS = "3101";
    public static final String IX_TWENTIES = "3102";
    public static final String IX_THIRTIES = "3103";
    public static final String IX_FORTIES = "3104";
    public static final String IX_FIFTIES = "3105";
    public static final String IX_SIXTIES = "3106";

    public double value() {
        if (touDivIxVal == null || touDivIxVal.isBlank()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(touDivIxVal.trim());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    public boolean hasValidRegion() {
        return signguCd != null && signguCd.length() == 5;
    }

    /** 로컬픽 세대 태그로 변환 */
    public String generationBucket() {
        return switch (touDivIxCd == null ? "" : touDivIxCd) {
            case IX_TWENTIES -> "TWENTIES";
            case IX_THIRTIES, IX_FORTIES -> "THIRTIES_FORTIES";
            case IX_FIFTIES, IX_SIXTIES -> "FIFTIES_PLUS";
            default -> "OTHER";
        };
    }
}
