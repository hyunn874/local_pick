package com.localpick.backend.domain.verification;

import com.localpick.backend.global.response.ApiResponse;
import com.localpick.backend.global.security.CurrentUserId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class VerificationController {

    private final VerificationService verificationService;

    /** POST /api/auth/resident-verify — 거주자 체크인 */
    @PostMapping("/resident-verify")
    public ApiResponse<ResidentVerifyResponse> checkIn(
            @CurrentUserId Long userId,
            @Valid @RequestBody ResidentVerifyRequest request) {
        return ApiResponse.ok(verificationService.checkIn(userId, request));
    }
}
