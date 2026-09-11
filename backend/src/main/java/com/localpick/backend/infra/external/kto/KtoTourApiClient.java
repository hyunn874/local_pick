package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpick.backend.infra.external.PublicApiClient;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 한국관광공사 국문관광정보서비스(KorService1) 클라이언트.
 *
 * 오퍼레이션
 *  - locationBasedList2 : 위치기반 관광정보 조회 (반경 내 관광지)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KtoTourApiClient {

    private static final String OP_LOCATION_BASED = "/locationBasedList2";

    private final PublicApiClient publicApiClient;
    private final ObjectMapper objectMapper;

    @Value("${localpick.kto.tour-base-url:}")
    private String tourBaseUrl;

    @Value("${localpick.kto.mobile-app:LocalPick}")
    private String mobileApp;

    /**
     * 위치 기반 주변 관광지 조회.
     *
     * @param mapX     경도 (longitude)
     * @param mapY     위도 (latitude)
     * @param radius   반경 (미터, 기본 5000)
     * @param numOfRows 조회 건수
     */
    public List<NearbyAttractionItem> fetchNearbyAttractions(
            double mapX, double mapY, int radius, int numOfRows) {

        if (tourBaseUrl == null || tourBaseUrl.isBlank()) {
            log.warn("[TourAPI] tour-base-url 미설정 — 빈 결과 반환");
            return List.of();
        }

        Map<String, String> params = new LinkedHashMap<>();
        params.put("MobileOS", "ETC");
        params.put("MobileApp", mobileApp);
        params.put("mapX", String.valueOf(mapX));
        params.put("mapY", String.valueOf(mapY));
        params.put("radius", String.valueOf(radius));
        params.put("numOfRows", String.valueOf(numOfRows));
        params.put("pageNo", "1");
        params.put("_type", "json");
        params.put("listYN", "Y");
        params.put("arrange", "E"); // 거리순

        String body = publicApiClient.callKto(tourBaseUrl + OP_LOCATION_BASED, params);
        return parseResponse(body);
    }

    private List<NearbyAttractionItem> parseResponse(String body) {
        List<NearbyAttractionItem> items = new ArrayList<>();
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode response = root.path("response");
            JsonNode header = response.path("header");

            String resultCode = header.path("resultCode").asText();
            if (!"0000".equals(resultCode)) {
                log.error("[TourAPI] 응답 오류: {} — {}", resultCode, header.path("resultMsg").asText());
                return items;
            }

            JsonNode itemsNode = response.path("body").path("items").path("item");
            if (itemsNode.isMissingNode() || itemsNode.isEmpty()) {
                log.info("[TourAPI] 검색 결과 없음");
                return items;
            }

            if (itemsNode.isArray()) {
                for (JsonNode node : itemsNode) {
                    items.add(parseItem(node));
                }
            } else {
                items.add(parseItem(itemsNode));
            }

            log.info("[TourAPI] {}건 조회 완료", items.size());
        } catch (Exception e) {
            log.error("[TourAPI] 파싱 오류", e);
        }
        return items;
    }

    private NearbyAttractionItem parseItem(JsonNode node) {
        return new NearbyAttractionItem(
                node.path("contentid").asText(),
                node.path("title").asText(),
                node.path("addr1").asText() + " " + node.path("addr2").asText(""),
                node.path("mapx").asDouble(),
                node.path("mapy").asDouble(),
                node.path("dist").asDouble(),
                node.path("firstimage").asText(""),
                node.path("firstimage2").asText(""),
                node.path("contenttypeid").asText(),
                node.path("tel").asText("")
        );
    }
}
