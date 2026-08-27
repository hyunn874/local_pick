package com.localpick.backend.domain.verification;

import com.localpick.backend.domain.region.Region;
import java.time.LocalDateTime;

public record ResidentVerifyResponse(
        String regionCode,
        String regionName,
        int checkInCount,
        int requiredCount,
        boolean verified,
        LocalDateTime verifiedUntil
) {

    public static ResidentVerifyResponse from(
            ResidentVerification v, Region region, LocalDateTime now) {
        return new ResidentVerifyResponse(
                region.getRegionCode(),
                region.getFullName(),
                v.getCheckInCount(),
                ResidentVerification.REQUIRED_CHECK_IN_COUNT,
                v.isValidAt(now),
                v.getVerifiedUntil()
        );
    }
}
