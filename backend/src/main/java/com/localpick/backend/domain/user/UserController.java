package com.localpick.backend.domain.user;

import com.localpick.backend.global.response.ApiResponse;
import com.localpick.backend.global.security.CurrentUserId;
import jakarta.validation.Valid;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /** GET /api/users/me — 내 정보 */
    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@CurrentUserId Long userId) {
        return ApiResponse.ok(userService.findMe(userId));
    }

    /** POST /api/users/me/onboarding — 닉네임·세대 설정 */
    @PostMapping("/me/onboarding")
    public ApiResponse<UserResponse> completeOnboarding(
            @CurrentUserId Long userId,
            @Valid @RequestBody OnboardingRequest request) {
        return ApiResponse.ok(userService.completeOnboarding(userId, request));
    }

    /** DELETE /api/users/me — 회원탈퇴 */
    @DeleteMapping("/me")
    public ApiResponse<Void> withdraw(@CurrentUserId Long userId) {
        userService.withdraw(userId);
        return ApiResponse.ok(null);
    }

    /** GET /api/users/nickname-check?nickname=유성구주민 — 중복 확인 */
    @GetMapping("/nickname-check")
    public ApiResponse<Map<String, Object>> checkNickname(@RequestParam String nickname) {
        boolean available = userService.isNicknameAvailable(nickname);
        return ApiResponse.ok(Map.of(
                "nickname", nickname,
                "available", available
        ));
    }
}
