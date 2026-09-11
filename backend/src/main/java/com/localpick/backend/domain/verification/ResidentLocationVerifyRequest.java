package com.localpick.backend.domain.verification;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** 거주자 인증 위치 요청. 좌표는 행정구역 변환과 인증 처리에만 사용한다. */
public record ResidentLocationVerifyRequest(
        @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
        @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude
) {
}
