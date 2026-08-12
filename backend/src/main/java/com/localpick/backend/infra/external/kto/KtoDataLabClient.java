package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.infra.external.PublicApiClient;
import java.time.LocalDate;
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
 * 한국관광공사 관광빅데이터 정보서비스 클라이언트 (방문자수).
 *
 * 오퍼레이션
 *  - locgoRegnVisitrDDList : 기초 지자체(시군구)  ← 로컬픽에서 사용
 *  - metcoRegnVisitrDDList : 광역 지자체(시도)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KtoDataLabClient {

    private static final DateTimeFormatter YMD = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String OP_LOCAL_VISITOR = "/locgoRegnVisitrDDList";
    private static final int PAGE_SIZE = 1000;
    private static final int MAX_PAGES = 20;

    private final PublicApiClient publicApiClient;
    private final KtoResponseParser parser;

    @Value("${localpick.kto.base-url}")
    private String baseUrl;

    @Value("${localpick.kto.mobile-app:LocalPick}")
    private String mobileApp;

    public List<RegionVisitorItem> fetchDailyVisitors(LocalDate date) {
        return fetchVisitors(date, date);
    }

    /** 기간 조회. 일 단위 데이터가 날짜별로 내려온다. */
    public List<RegionVisitorItem> fetchVisitors(LocalDate startDate, LocalDate endDate) {
        List<RegionVisitorItem> all = new ArrayList<>();
        int pageNo = 1;

        while (pageNo <= MAX_PAGES) {
            KtoApiResponse<RegionVisitorItem> response = callPage(startDate, endDate, pageNo);

            if (!response.isSuccess()) {
                log.error("[KTO] 응답 오류: {}", response.resultMessage());
                throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
            }

            List<RegionVisitorItem> items = response.items();
            all.addAll(items);

            int total = response.totalCount();
            log.info("[KTO] {}~{} p{} — {}건 수신 (누적 {}/{})",
                    startDate, endDate, pageNo, items.size(), all.size(), total);

            if (items.isEmpty() || all.size() >= total) {
                break;
            }
            pageNo++;
        }
        return all;
    }

    private KtoApiResponse<RegionVisitorItem> callPage(
            LocalDate startDate, LocalDate endDate, int pageNo) {

        Map<String, String> params = new LinkedHashMap<>();
        params.put("MobileOS", "ETC");
        params.put("MobileApp", mobileApp);
        params.put("startYmd", startDate.format(YMD));
        params.put("endYmd", endDate.format(YMD));
        params.put("numOfRows", String.valueOf(PAGE_SIZE));
        params.put("pageNo", String.valueOf(pageNo));
        params.put("_type", "json");

        String body = publicApiClient.callKto(baseUrl + OP_LOCAL_VISITOR, params);
        return parser.parse(body, new TypeReference<>() {});
    }
}
