package com.localpick.backend.domain.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * 카카오 로그인 요청.
 *
 * 프론트는 카카오에서 받은 인가코드만 전달한다.
 * 토큰 교환은 서버가 수행하므로 REST API 키가 앱에 포함되지 않는다.
 */
public record KakaoLoginRequest(
        @NotBlank(message = "인가코드가 필요합니다.")
        String code,

        @NotBlank(message = "redirectUri 가 필요합니다.")
        String redirectUri
) {}
