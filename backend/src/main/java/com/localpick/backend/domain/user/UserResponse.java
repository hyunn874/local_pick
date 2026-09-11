package com.localpick.backend.domain.user;

import com.localpick.backend.domain.region.RegionResponse;
import com.localpick.backend.domain.verification.ResidentVerification;
import java.time.LocalDate;
import java.time.LocalDateTime;

/** 회원 정보 응답 */
public record UserResponse(
        Long id,
        String kakaoId,
        String appleId,
        String nickname,
        GenerationTag generationTag,
        String generationLabel,
        String profileImageUrl,
        boolean onboarded,
        int localPassBalance,
        RegionResponse region,
        boolean isResidentVerified,
        int verifyCount,
        LocalDate nextVerifyDate,
        String badgeStatus
) {

    public static UserResponse from(User user) {
        return from(user, null, LocalDateTime.now());
    }

    public static UserResponse from(User user, ResidentVerification verification, LocalDateTime now) {
        String badgeStatus = verification != null ? verification.badgeStatus(now) : "inactive";
        boolean isResidentVerified = verification != null
                && verification.getVerifyCount() > 0;

        return new UserResponse(
                user.getId(),
                user.getKakaoId(),
                user.getAppleId(),
                user.getNickname(),
                user.getGenerationTag(),
                user.getGenerationTag() != null ? user.getGenerationTag().getLabel() : null,
                user.getProfileImageUrl(),
                user.isOnboarded(),
                user.getLocalPassBalance(),
                verification != null ? RegionResponse.from(verification.getRegion()) : null,
                isResidentVerified,
                verification != null ? verification.getVerifyCount() : 0,
                verification != null ? verification.nextVerifyDate() : null,
                badgeStatus
        );
    }
}
