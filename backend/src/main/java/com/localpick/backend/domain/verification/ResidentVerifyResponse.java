package com.localpick.backend.domain.verification;

import com.localpick.backend.domain.region.RegionResponse;
import java.time.LocalDate;

public record ResidentVerifyResponse(
        int verifyCount,
        int requiredCount,
        boolean isVerified,
        LocalDate nextVerifyDate,
        String badgeStatus,
        RegionResponse region
) {
}
