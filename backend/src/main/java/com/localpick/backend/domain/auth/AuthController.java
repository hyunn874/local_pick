package com.localpick.backend.domain.auth;

import com.localpick.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 카카오 로그인.
     * 앱에서 받은 인가코드를 전달하면 서버가 토큰 교환 후 자체 JWT 를 발급한다.
     */
    @PostMapping("/kakao")
    public ApiResponse<AuthResponse> loginWithKakao(
            @Valid @RequestBody KakaoLoginRequest request) {
        return ApiResponse.ok(authService.loginWithKakao(request));
    }

    /** 액세스 토큰 갱신 */
    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }
}
