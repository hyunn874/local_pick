package com.localpick.backend.domain.auth;

import jakarta.validation.constraints.NotBlank;

/**
 * Apple 로그인 요청.
 * 앱에서 Apple Sign In SDK 가 반환한 identityToken(JWT)을 전달한다.
 */
public record AppleLoginRequest(
        @NotBlank(message = "identityToken 이 필요합니다.")
        String identityToken
) {}
