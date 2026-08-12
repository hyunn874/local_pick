package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.infra.external.PublicApiClient;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 지역별 관광 수요 강도 / 관광 다양성 클라이언트.
 *
 * 방문자수 API 와 달리 두 가지 제약이 있다.
 *  1. 월 단위 조회 (baseYm)
 *  2. areaCd(시도 코드) 필수 → 전국은 시도별 순회 필요
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KtoDemandClient {

    private static final DateTimeFormatter YM = DateTimeFormatter.ofPattern("yyyyMM");
    private static final int PAGE_SIZE = 500;
    private static final int MAX_PAGES = 20;

    public static final String OP_STAY = "/areaTarSjrnDsList";      // 체류 강도
    public static final String OP_EXPENSE = "/areaTarExpDsList";    // 소비 강도
    public static final String OP_TOURIST_DIV = "/areaTouDivList";  // 관광객 다양성
    public static final String OP_EXPENSE_DIV = "/areaExpDivList";  // 소비 다양성

    /** 전국 시도 코드 */
    public static final List<String> ALL_AREA_CODES = List.of(
            "11", "26", "27", "28", "29", "30", "31", "36",
            "41", "42", "43", "44", "45", "46", "47", "48", "50", "51", "52"
    );

    private final PublicApiClient publicApiClient;
    private final KtoResponseParser parser;

    @Value("${localpick.kto.demand-base-url}")
    private String demandBaseUrl;

    @Value("${localpick.kto.diversity-base-url}")
    private String diversityBaseUrl;

    @Value("${localpick.kto.mobile-app:LocalPick}")
    private String mobileApp;

    // ---------- 체류 강도 ----------

    public List<StayIntensityItem> fetchAllStayIntensity(YearMonth month, String indexCode) {
        return fetchAllAreas(demandBaseUrl + OP_STAY, month, "tarSjrnDsIxCd", indexCode,
                new TypeReference<KtoApiResponse<StayIntensityItem>>() {});
    }

    // ---------- 소비 강도 ----------

    public List<ExpenseIntensityItem> fetchAllExpenseIntensity(YearMonth month, String indexCode) {
        return fetchAllAreas(demandBaseUrl + OP_EXPENSE, month, "tarExpDsIxCd", indexCode,
                new TypeReference<KtoApiResponse<ExpenseIntensityItem>>() {});
    }

    // ---------- 관광객 다양성 ----------

    public List<TouristDiversityItem> fetchAllTouristDiversity(YearMonth month, String indexCode) {
        return fetchAllAreas(diversityBaseUrl + OP_TOURIST_DIV, month, "touDivIxCd", indexCode,
                new TypeReference<KtoApiResponse<TouristDiversityItem>>() {});
    }

    // ---------- 공통 ----------

    /** 단일 시도 조회. 규격 확인이나 부분 수집에 사용. */
    public <T> List<T> fetchOneArea(String url, YearMonth month, String areaCd,
                                    String indexParamName, String indexCode,
                                    TypeReference<KtoApiResponse<T>> typeRef) {
        return fetchPaged(url, month, areaCd, indexParamName, indexCode, typeRef);
    }

    private <T> List<T> fetchAllAreas(String url, YearMonth month,
                                      String indexParamName, String indexCode,
                                      TypeReference<KtoApiResponse<T>> typeRef) {
        List<T> all = new ArrayList<>();
        int failed = 0;

        for (String areaCd : ALL_AREA_CODES) {
            try {
                all.addAll(fetchPaged(url, month, areaCd, indexParamName, indexCode, typeRef));
            } catch (Exception e) {
                failed++;
                log.warn("[KTO-Demand] areaCd={} 조회 실패: {}", areaCd, e.getMessage());
            }
        }

        log.info("[KTO-Demand] {} {} 지표={} — 총 {}건 (실패 시도 {}개)",
                url.substring(url.lastIndexOf('/')), month, indexCode, all.size(), failed);
        return all;
    }

    private <T> List<T> fetchPaged(String url, YearMonth month, String areaCd,
                                   String indexParamName, String indexCode,
                                   TypeReference<KtoApiResponse<T>> typeRef) {
        // 가이드 문서에는 옵션(0)으로 표기되어 있으나, 지표 코드를 지정하지 않으면
        // resultCode 0000 에 결과 0건이 반환된다. 실질적으로 필수 파라미터다.
        if (indexCode == null || indexCode.isBlank()) {
            throw new IllegalArgumentException(
                    "지표 코드(" + indexParamName + ")는 필수입니다. 생략하면 0건이 반환됩니다.");
        }

        List<T> all = new ArrayList<>();
        int pageNo = 1;

        while (pageNo <= MAX_PAGES) {
            Map<String, String> params = new LinkedHashMap<>();
            params.put("MobileOS", "ETC");
            params.put("MobileApp", mobileApp);
            params.put("baseYm", month.format(YM));
            params.put("areaCd", areaCd);
            params.put(indexParamName, indexCode);
            params.put("numOfRows", String.valueOf(PAGE_SIZE));
            params.put("pageNo", String.valueOf(pageNo));
            params.put("_type", "json");

            String body = publicApiClient.callKto(url, params);
            KtoApiResponse<T> response = parser.parse(body, typeRef);

            if (!response.isSuccess()) {
                log.error("[KTO-Demand] 응답 오류 (areaCd={}): {}", areaCd, response.resultMessage());
                throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
            }

            List<T> items = response.items();
            all.addAll(items);

            if (items.isEmpty() || all.size() >= response.totalCount()) {
                break;
            }
            pageNo++;
        }
        return all;
    }
}
