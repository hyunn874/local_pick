package com.localpick.backend.domain.localpass;

import com.localpick.backend.global.response.ApiResponse;
import com.localpick.backend.global.security.CurrentUserId;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/local-pass", "/api/localpass"})
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

    /** POST /api/local-pass/use — 로컬패스 사용 또는 body { placeId } 명소 열람 */
    @PostMapping("/use")
    public ApiResponse<?> use(
            @CurrentUserId Long userId,
            @Valid @RequestBody LocalPassUseRequest request) {
        if (request.placeId() != null) {
            return ApiResponse.ok(localPassService.useForPlace(userId, request.placeId()));
        }
        return ApiResponse.ok(localPassService.use(userId, request));
    }

    /** POST /api/localpass/use — 명소 열람용 로컬패스 사용 */
    @PostMapping("/use-place")
    public ApiResponse<LocalPassUsePlaceResponse> usePlace(
            @CurrentUserId Long userId,
            @Valid @RequestBody LocalPassUsePlaceRequest request) {
        return ApiResponse.ok(localPassService.useForPlace(userId, request.placeId()));
    }

    /** GET /api/localpass/viewed?placeId=1 */
    @GetMapping("/viewed")
    public ApiResponse<PlaceViewedResponse> viewed(
            @CurrentUserId Long userId,
            @RequestParam Long placeId) {
        return ApiResponse.ok(localPassService.isViewed(userId, placeId));
    }

    /** GET /api/localpass/viewed-places */
    @GetMapping("/viewed-places")
    public ApiResponse<List<ViewedPlaceResponse>> viewedPlaces(@CurrentUserId Long userId) {
        return ApiResponse.ok(localPassService.getViewedPlaces(userId));
    }
}
