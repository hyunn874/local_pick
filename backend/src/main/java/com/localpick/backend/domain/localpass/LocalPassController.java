package com.localpick.backend.domain.localpass;

import com.localpick.backend.global.response.ApiResponse;
import com.localpick.backend.global.security.CurrentUserId;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/local-pass")
@RequiredArgsConstructor
public class LocalPassController {

    private final LocalPassService localPassService;

    /** GET /api/local-pass/balance — 잔액 조회 */
    @GetMapping("/balance")
    public ApiResponse<LocalPassBalanceResponse> balance(@CurrentUserId Long userId) {
        return ApiResponse.ok(localPassService.getBalance(userId));
    }

    /** GET /api/local-pass/history — 적립·사용 이력 */
    @GetMapping("/history")
    public ApiResponse<List<LocalPassHistoryResponse>> history(
            @CurrentUserId Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(localPassService.getHistory(userId, page, size));
    }

    /** POST /api/local-pass/use — 로컬패스 사용 */
    @PostMapping("/use")
    public ApiResponse<LocalPassHistoryResponse> use(
            @CurrentUserId Long userId,
            @Valid @RequestBody LocalPassUseRequest request) {
        return ApiResponse.ok(localPassService.use(userId, request));
    }
}
