package com.localpick.backend.domain.post;

import com.localpick.backend.global.response.ApiResponse;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PostService postService;

    /** GET /api/places/adopted?regionCode=11110 — 채택된 명소 목록 */
    @GetMapping("/adopted")
    public ApiResponse<List<AdoptedPlaceResponse>> adopted(
            @RequestParam String regionCode) {
        return ApiResponse.ok(postService.findAdoptedPlaces(regionCode));
    }
}
