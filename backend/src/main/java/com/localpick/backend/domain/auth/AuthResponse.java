package com.localpick.backend.domain.auth;

import com.localpick.backend.domain.user.UserResponse;

/** 로그인 / 토큰 갱신 응답 */
public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        boolean isNewUser,
        boolean isOnboarded,
        UserResponse user
) {

    public static AuthResponse of(String accessToken, String refreshToken, long expiresIn,
                                  boolean isNewUser, UserResponse user) {
        return new AuthResponse(
                accessToken, refreshToken, expiresIn,
                isNewUser, user.onboarded(), user);
    }
}
