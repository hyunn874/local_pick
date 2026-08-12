package com.localpick.backend.domain.region;

import com.localpick.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/regions")
@RequiredArgsConstructor
public class RegionController {

    private final RegionService regionService;

    /** GET /api/regions?sido=대전광역시 */
    @GetMapping
    public ApiResponse<List<RegionResponse>> getRegions(
            @RequestParam(required = false) String sido) {
        return ApiResponse.ok(regionService.findAll(sido));
    }

    /** GET /api/regions/30200 */
    @GetMapping("/{regionCode}")
    public ApiResponse<RegionResponse> getRegion(@PathVariable String regionCode) {
        return ApiResponse.ok(regionService.findByCode(regionCode));
    }

    /**
     * GET /api/regions/search?sido=대전광역시&sigungu=유성구
     * 앱이 Reverse Geocoding 결과(행정구역 텍스트)로 지역을 조회할 때 사용한다.
     */
    @GetMapping("/search")
    public ApiResponse<RegionResponse> searchRegion(
            @RequestParam String sido,
            @RequestParam String sigungu) {
        return ApiResponse.ok(regionService.findByName(sido, sigungu));
    }
}
