package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * 기초 지자체 지역방문자수 집계 데이터 (locgoRegnVisitrDDList) 한 건.
 *
 * 같은 시군구·같은 날짜에 대해 관광객 구분별로 3건이 내려온다.
 *   touDivCd = 1(현지인) / 2(외지인) / 3(외국인)
 *
 * 관광 소외도 산정에는 외지인(2)만 사용한다.
 * 현지인 방문은 통근·생활권 이동이라 관광 신호로 볼 수 없기 때문이다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RegionVisitorItem(
        String signguCode,
        String signguNm,
        String daywkDivCd,
        String daywkDivNm,
        String touDivCd,
        String touDivNm,
        String touNum,
        String baseYmd
) {

    /** 외지인 구분 코드 */
    public static final String TOU_DIV_OUTSIDER = "2";
    public static final String TOU_DIV_LOCAL = "1";
    public static final String TOU_DIV_FOREIGNER = "3";

    public boolean isOutsider() {
        return TOU_DIV_OUTSIDER.equals(touDivCd);
    }

    /** touNum 은 "176473.5" 같은 실수형 문자열로 내려온다. */
    public double visitorCount() {
        if (touNum == null || touNum.isBlank()) {
            return 0.0;
        }
        try {
            return Double.parseDouble(touNum.trim());
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    public boolean hasValidRegion() {
        return signguCode != null && signguCode.length() == 5
                && signguNm != null && !signguNm.isBlank();
    }
}
