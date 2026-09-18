package com.localpick.backend.domain.place;

import com.localpick.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceSearchController {

    private final PlaceSearchService placeSearchService;

    @GetMapping("/search")
    public ApiResponse<List<PlaceSearchResponse>> search(
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(required = false) String region) {
        return ApiResponse.ok(placeSearchService.search(keyword, region));
    }
}
