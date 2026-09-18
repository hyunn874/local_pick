package com.localpick.backend.infra.external.naver;

import com.fasterxml.jackson.databind.JsonNode;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class NaverGeocodingClient {

    private final RestClient restClient;
    private final String geocodingUrl;
    private final String clientId;
    private final String clientSecret;

    public NaverGeocodingClient(
            @Qualifier("publicApiRestClient") RestClient restClient,
            @Value("${localpick.naver.maps.geocoding-url}") String geocodingUrl,
            @Value("${localpick.naver.maps.key-id:}") String clientId,
            @Value("${localpick.naver.maps.secret:}") String clientSecret) {
        this.restClient = restClient;
        this.geocodingUrl = geocodingUrl;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public JsonNode search(String keyword) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            log.warn("[NaverGeocoding] API credentials are missing");
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }

        try {
            JsonNode payload = restClient.get()
                    .uri(geocodingUrl, builder -> builder.queryParam("query", keyword).build())
                    .header("X-NCP-APIGW-API-KEY-ID", clientId)
                    .header("X-NCP-APIGW-API-KEY", clientSecret)
                    .header("Accept", "application/json")
                    .retrieve()
                    .body(JsonNode.class);

            if (payload == null || !"OK".equals(payload.path("status").asText())) {
                throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
            }
            return payload;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[NaverGeocoding] API call failed", e);
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }
    }
}
