package com.localpick.backend.domain.auth;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "refreshToken 이 필요합니다.")
        String refreshToken
) {}
