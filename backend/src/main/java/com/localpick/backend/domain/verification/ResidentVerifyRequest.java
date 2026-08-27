package com.localpick.backend.domain.verification;

import jakarta.validation.constraints.NotBlank;

/** 거주자 인증 요청. GPS 좌표가 아닌 행정구역 텍스트만 받는다. */
public record ResidentVerifyRequest(
        @NotBlank String sidoName,
        @NotBlank String sigunguName
) {
}
