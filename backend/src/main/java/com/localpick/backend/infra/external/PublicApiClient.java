package com.localpick.backend.infra.external;

import java.net.URI;
import java.util.Map;
import java.util.StringJoiner;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;

/**
 * 공공데이터포털 API 호출기.
 *
 * 인증키(serviceKey)는 이미 디코딩된 값이므로 다시 인코딩하지 않고 그대로 붙인다.
 * 이중 인코딩되면 SERVICE_KEY_IS_NOT_REGISTERED_ERROR 가 발생한다.
 */
@Slf4j
@Component
public class PublicApiClient {

    private final RestClient restClient;
    private final String ktoServiceKey;
    private final String moisServiceKey;

    public PublicApiClient(RestClient publicApiRestClient,
                           @Value("${localpick.kto.service-key:}") String ktoServiceKey,
                           @Value("${localpick.mois.service-key:}") String moisServiceKey) {
        this.restClient = publicApiRestClient;
        this.ktoServiceKey = ktoServiceKey;
        this.moisServiceKey = moisServiceKey;
    }

    public String callKto(String url, Map<String, String> params) {
        return call(url, params, ktoServiceKey);
    }

    public String callMois(String url, Map<String, String> params) {
        return call(url, params, moisServiceKey);
    }

    public String call(String baseUrl, Map<String, String> params, String serviceKey) {
        if (serviceKey == null || serviceKey.isBlank()) {
            throw new IllegalStateException(
                    "인증키가 설정되지 않았습니다. application-local.yml 의 service-key 를 확인하세요.");
        }
        if (baseUrl == null || !(baseUrl.startsWith("http://") || baseUrl.startsWith("https://"))) {
            throw new IllegalArgumentException("올바른 URL 이 아닙니다: " + baseUrl);
        }

        String fullUrl = buildUrl(baseUrl, params, serviceKey);
        log.info("[PublicApi] 요청 → {}", maskKey(fullUrl));

        String body = restClient.get()
                .uri(URI.create(fullUrl))
                .retrieve()
                .body(String.class);

        log.info("[PublicApi] 응답 {}자", body == null ? 0 : body.length());
        return body;
    }

    /** serviceKey 만 원본 유지하고 나머지 파라미터는 UTF-8 인코딩한다. */
    private String buildUrl(String baseUrl, Map<String, String> params, String serviceKey) {
        String base = baseUrl.contains("?") ? baseUrl.split("\\?")[0] : baseUrl;

        StringJoiner query = new StringJoiner("&");
        query.add("serviceKey=" + serviceKey);

        params.forEach((k, v) -> {
            if (k != null && !k.isBlank() && v != null) {
                query.add(UriUtils.encode(k, StandardCharsets.UTF_8)
                        + "=" + UriUtils.encode(v, StandardCharsets.UTF_8));
            }
        });

        return base + "?" + query;
    }

    private String maskKey(String url) {
        return url.replaceAll("serviceKey=[^&]+", "serviceKey=***");
    }
}
