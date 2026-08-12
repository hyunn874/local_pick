package com.localpick.backend.infra.external.kto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * 공사 API 응답 문자열을 DTO 로 변환한다.
 *
 * 공사 API 는 결과가 0건일 때 items 를 빈 문자열로 내려보낸다.
 *   "items": ""        ← 0건
 *   "items": {"item":[...]}  ← 정상
 * 타입이 달라져 그대로 파싱하면 예외가 나므로, 파싱 전에 빈 형태로 치환한다.
 *
 * 또한 결과가 1건일 때 item 이 배열이 아닌 단일 객체로 오는 경우가 있어
 * ACCEPT_SINGLE_VALUE_AS_ARRAY 설정으로 처리한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KtoResponseParser {

    private static final String EMPTY_ITEMS_PATTERN = "\"items\"\\s*:\\s*\"\"";
    private static final String EMPTY_ITEMS_REPLACEMENT = "\"items\":{\"item\":[]}";

    private final ObjectMapper objectMapper;

    public <T> KtoApiResponse<T> parse(String body, TypeReference<KtoApiResponse<T>> typeRef) {
        if (body == null || body.isBlank()) {
            log.error("[KTO] 응답 본문이 비어 있습니다.");
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }

        String normalized = body.replaceAll(EMPTY_ITEMS_PATTERN, EMPTY_ITEMS_REPLACEMENT);

        try {
            return objectMapper
                    .copy()
                    .configure(com.fasterxml.jackson.databind.DeserializationFeature
                            .ACCEPT_SINGLE_VALUE_AS_ARRAY, true)
                    .readValue(normalized, typeRef);
        } catch (Exception e) {
            log.error("[KTO] 응답 파싱 실패: {} / 본문 앞부분: {}",
                    e.getMessage(),
                    normalized.substring(0, Math.min(300, normalized.length())));
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }
    }
}
