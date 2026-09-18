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
public class NaverLocalSearchClient {

    private final RestClient restClient;
    private final String searchUrl;
    private final String clientId;
    private final String clientSecret;

    public NaverLocalSearchClient(
            @Qualifier("publicApiRestClient") RestClient restClient,
            @Value("${localpick.naver.local-search.url}") String searchUrl,
            @Value("${localpick.naver.local-search.key-id:}") String clientId,
            @Value("${localpick.naver.local-search.secret:}") String clientSecret) {
        this.restClient = restClient;
        this.searchUrl = searchUrl;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }

    public JsonNode search(String keyword) {
        if (clientId.isBlank() || clientSecret.isBlank()) {
            log.warn("[NaverLocalSearch] API credentials are missing");
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }

        try {
            JsonNode payload = restClient.get()
                    .uri(searchUrl, builder -> builder
                            .queryParam("query", keyword)
                            .queryParam("display", 5)
                            .queryParam("format", "json")
                            .build())
                    .header("X-NCP-APIGW-API-KEY-ID", clientId)
                    .header("X-NCP-APIGW-API-KEY", clientSecret)
                    .header("Accept", "application/json")
                    .retrieve()
                    .body(JsonNode.class);

            if (payload == null || !payload.path("items").isArray()) {
                throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
            }
            return payload;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[NaverLocalSearch] API call failed", e);
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }
    }
}
