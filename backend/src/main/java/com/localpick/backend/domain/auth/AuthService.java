package com.localpick.backend.domain.auth;

import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import com.localpick.backend.domain.user.UserResponse;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.global.security.JwtTokenProvider;
import com.localpick.backend.infra.external.kakao.KakaoOAuthClient;
import com.localpick.backend.infra.external.kakao.KakaoTokenResponse;
import com.localpick.backend.infra.external.kakao.KakaoUserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 카카오 로그인 및 토큰 관리.
 *
 * 흐름
 *   앱에서 인가코드 수신 → 서버가 카카오 토큰 교환 → 사용자 정보 조회
 *   → kakaoId 로 회원 조회, 없으면 가입 → 자체 JWT 발급
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final KakaoOAuthClient kakaoOAuthClient;
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;

    @org.springframework.beans.factory.annotation.Value("${localpick.kakao.rest-api-key:}")
    private String restApiKey;

    /** 인증 시작 URL 조립에 필요해 노출한다. */
    public String restApiKey() {
        return restApiKey;
    }

    @Transactional
    public AuthResponse loginWithKakao(KakaoLoginRequest request) {
        KakaoTokenResponse token =
                kakaoOAuthClient.exchangeCodeForToken(request.code(), request.redirectUri());

        KakaoUserResponse kakaoUser = kakaoOAuthClient.fetchUserInfo(token.accessToken());
        String kakaoId = kakaoUser.kakaoId();

        User user = userRepository.findByKakaoId(kakaoId).orElse(null);
        boolean isNewUser = (user == null);

        if (isNewUser) {
            user = userRepository.save(User.builder()
                    .kakaoId(kakaoId)
                    .profileImageUrl(kakaoUser.profileImageUrl())
                    .build());
            log.info("[Auth] 신규 가입 — userId={}", user.getId());
            // 가입 보너스 로컬패스는 온보딩 완료 시점에 지급한다.
            // 온보딩을 마치지 않은 계정에 잔액이 쌓이는 것을 막기 위함.
        } else {
            // 프로필 이미지는 변경될 수 있으므로 로그인 때마다 갱신한다.
            if (kakaoUser.profileImageUrl() != null) {
                user.updateProfileImage(kakaoUser.profileImageUrl());
            }
        }

        return issueTokens(user, isNewUser);
    }

    @Transactional(readOnly = true)
    public AuthResponse refresh(RefreshRequest request) {
        String refreshToken = request.refreshToken();

        if (!jwtTokenProvider.isRefreshToken(refreshToken)) {
            throw new BusinessException(ErrorCode.INVALID_TOKEN);
        }

        Long userId = jwtTokenProvider.parseUserId(refreshToken);
        if (userId == null) {
            throw new BusinessException(ErrorCode.EXPIRED_TOKEN);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return issueTokens(user, false);
    }

    private AuthResponse issueTokens(User user, boolean isNewUser) {
        return AuthResponse.of(
                jwtTokenProvider.createAccessToken(user.getId()),
                jwtTokenProvider.createRefreshToken(user.getId()),
                jwtTokenProvider.getAccessTokenValiditySeconds(),
                isNewUser,
                UserResponse.from(user)
        );
    }
}
