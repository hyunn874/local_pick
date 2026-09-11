package com.localpick.backend.infra.external.naver;

import com.fasterxml.jackson.databind.JsonNode;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class NaverReverseGeocodingClient {

    @Qualifier("publicApiRestClient")
    private final RestClient restClient;

    @Value("${localpick.naver.maps.reverse-geocoding-url}")
    private String reverseGeocodingUrl;

    @Value("${localpick.naver.maps.key-id:}")
    private String keyId;

    @Value("${localpick.naver.maps.secret:}")
    private String secret;

    public NaverRegion reverseGeocode(double latitude, double longitude) {
        if (keyId == null || keyId.isBlank() || secret == null || secret.isBlank()) {
            log.warn("[NaverReverseGeocoding] API credentials are missing");
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }

        try {
            JsonNode payload = restClient.get()
                    .uri(reverseGeocodingUrl, builder -> builder
                            .queryParam("coords", longitude + "," + latitude)
                            .queryParam("orders", "legalcode,admcode")
                            .queryParam("output", "json")
                            .build())
                    .header("X-NCP-APIGW-API-KEY-ID", keyId)
                    .header("X-NCP-APIGW-API-KEY", secret)
                    .retrieve()
                    .body(JsonNode.class);

            return extractRegion(payload);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[NaverReverseGeocoding] API call failed", e);
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }
    }

    private NaverRegion extractRegion(JsonNode payload) {
        JsonNode results = payload == null ? null : payload.path("results");

        if (results == null || !results.isArray() || results.isEmpty()) {
            throw new BusinessException(ErrorCode.REGION_NOT_FOUND);
        }

        for (JsonNode result : results) {
            JsonNode region = result.path("region");
            String sidoName = region.path("area1").path("name").asText("");
            String sigunguName = region.path("area2").path("name").asText("");

            if (!sidoName.isBlank() && !sigunguName.isBlank()) {
                return new NaverRegion(sidoName, sigunguName);
            }
        }

        throw new BusinessException(ErrorCode.REGION_NOT_FOUND);
    }
}
