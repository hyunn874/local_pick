package com.localpick.backend.domain.user;

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
        int localPassBalance
) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getKakaoId(),
                user.getAppleId(),
                user.getNickname(),
                user.getGenerationTag(),
                user.getGenerationTag() != null ? user.getGenerationTag().getLabel() : null,
                user.getProfileImageUrl(),
                user.isOnboarded(),
                user.getLocalPassBalance()
        );
    }
}
