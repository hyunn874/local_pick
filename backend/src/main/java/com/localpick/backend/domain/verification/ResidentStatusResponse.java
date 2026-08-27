package com.localpick.backend.domain.verification;

import java.time.LocalDate;

public record ResidentStatusResponse(
        boolean isVerified,
        int verifyCount,
        LocalDate lastVerifyDate,
        LocalDate nextVerifyDate,
        String badgeStatus
) {
}
