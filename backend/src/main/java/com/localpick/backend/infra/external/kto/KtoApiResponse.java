package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * 공사 API 공통 응답 구조.
 *
 * 주의: 결과가 0건이면 items 가 객체가 아니라 빈 문자열로 내려온다.
 *   정상: "items": { "item": [ ... ] }
 *   0건 : "items": ""
 * 이 보정은 KtoResponseParser 에서 처리한다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KtoApiResponse<T>(
        @JsonProperty("response") Response<T> response
) {

    public static final String SUCCESS_CODE = "0000";

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Response<T>(Header header, Body<T> body) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Header(String resultCode, String resultMsg) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Body<T>(
            Items<T> items,
            Integer numOfRows,
            Integer pageNo,
            Integer totalCount
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Items<T>(List<T> item) {}

    public boolean isSuccess() {
        return response != null
                && response.header() != null
                && SUCCESS_CODE.equals(response.header().resultCode());
    }

    public String resultMessage() {
        return response != null && response.header() != null
                ? response.header().resultCode() + " " + response.header().resultMsg()
                : "응답 헤더 없음";
    }

    public List<T> items() {
        if (response == null || response.body() == null
                || response.body().items() == null
                || response.body().items().item() == null) {
            return List.of();
        }
        return response.body().items().item();
    }

    public int totalCount() {
        return response != null && response.body() != null && response.body().totalCount() != null
                ? response.body().totalCount()
                : 0;
    }

    public boolean isEmpty() {
        return items().isEmpty();
    }
}
