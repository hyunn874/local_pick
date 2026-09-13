package com.localpick.backend.domain.verification;

import com.localpick.backend.domain.region.RegionResponse;
import java.time.LocalDate;

public record ResidentStatusResponse(
        boolean isVerified,
        boolean residentAccess,
        int verifyCount,
        int requiredCount,
        LocalDate lastVerifyDate,
        LocalDate nextVerifyDate,
        String badgeStatus,
        RegionResponse region
) {
}
