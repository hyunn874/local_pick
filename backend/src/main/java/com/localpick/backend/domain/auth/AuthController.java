package com.localpick.backend.domain.auth;

import com.localpick.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${localpick.kakao.callback-url}")
    private String callbackUrl;

    @Value("${localpick.app.scheme-success-url}")
    private String appSuccessUrl;

    /**
     * 카카오 로그인 (앱 스킴 방식).
     * 앱이 인가코드를 직접 받아 전달할 수 있을 때 사용한다.
     */
    @PostMapping("/kakao")
    public ApiResponse<AuthResponse> loginWithKakao(
            @Valid @RequestBody KakaoLoginRequest request) {
        return ApiResponse.ok(authService.loginWithKakao(request));
    }

    /**
     * 카카오 인증 시작 — 브라우저를 이 주소로 열면 카카오 로그인 화면으로 넘어간다.
     *
     * 카카오는 REST API 키 방식에서 http(s) 리다이렉트 URI 만 허용하므로
     * 앱 스킴(localpick://) 을 직접 등록할 수 없다. 그래서 서버가 콜백을 받고
     * 처리 결과를 앱 스킴으로 다시 넘겨준다.
     */
    @GetMapping("/kakao/authorize")
    public ResponseEntity<Void> authorize() {
        String url = UriComponentsBuilder
                .fromUriString("https://kauth.kakao.com/oauth/authorize")
                .queryParam("client_id", authService.restApiKey())
                .queryParam("redirect_uri", callbackUrl)
                .queryParam("response_type", "code")
                .build()
                .toUriString();

        return ResponseEntity.status(302).location(URI.create(url)).build();
    }

    /**
     * 카카오 콜백 — 인가코드를 받아 로그인 처리 후 앱으로 되돌려보낸다.
     *
     * 성공: localpick://auth/kakao?accessToken=...&refreshToken=...&isOnboarded=...
     * 실패: localpick://auth/kakao?error=...
     */
    @GetMapping("/kakao/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            @RequestParam(required = false, name = "error_description") String errorDescription) {

        if (error != null || code == null) {
            log.warn("[Auth] 카카오 콜백 실패: {} / {}", error, errorDescription);
            return redirectToApp(Map.of(
                    "error", error != null ? error : "no_code",
                    "message", errorDescription != null ? errorDescription : "인가코드를 받지 못했습니다."
            ));
        }

        try {
            AuthResponse auth = authService.loginWithKakao(
                    new KakaoLoginRequest(code, callbackUrl));

            return redirectToApp(Map.of(
                    "accessToken", auth.accessToken(),
                    "refreshToken", auth.refreshToken(),
                    "isNewUser", String.valueOf(auth.isNewUser()),
                    "isOnboarded", String.valueOf(auth.isOnboarded())
            ));

        } catch (Exception e) {
            log.error("[Auth] 카카오 콜백 처리 실패", e);
            return redirectToApp(Map.of(
                    "error", "login_failed",
                    "message", e.getMessage() == null ? "로그인에 실패했습니다." : e.getMessage()
            ));
        }
    }

    private ResponseEntity<Void> redirectToApp(Map<String, String> params) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(appSuccessUrl);
        params.forEach(builder::queryParam);

        URI uri = URI.create(builder.build().encode(StandardCharsets.UTF_8).toUriString());
        return ResponseEntity.status(302).location(uri).build();
    }

    /** 액세스 토큰 갱신 */
    @PostMapping("/refresh")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }
}
