package com.localpick.backend.domain.attraction;

import com.localpick.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/attractions")
@RequiredArgsConstructor
public class AttractionController {

    private final AttractionService attractionService;

    /**
     * GET /api/attractions/nearby?lng=127.372&lat=36.374&radius=5000&limit=10
     *
     * 좌표 기반 주변 관광지 조회. 채택 명소 상세 화면에서 "주변 관광지 더보기"에 사용.
     */
    @GetMapping("/nearby")
    public ApiResponse<List<NearbyAttractionResponse>> nearby(
            @RequestParam double lng,
            @RequestParam double lat,
            @RequestParam(defaultValue = "5000") int radius,
            @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.ok(attractionService.findNearby(lng, lat, radius, limit));
    }
}
