package com.localpick.backend.domain.visitor;

import com.localpick.backend.global.response.ApiResponse;
import java.time.LocalDate;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

/** 방문자수 수집 확인용. local 프로파일 전용. */
@Profile("local")
@RestController
@RequestMapping("/api/dev/visitors")
@RequiredArgsConstructor
public class VisitorDevController {

    private final VisitorCollectService visitorCollectService;
    private final VisitorQueryService visitorQueryService;

    /** POST /api/dev/visitors/collect?date=2021-05-13 */
    @PostMapping("/collect")
    public ApiResponse<VisitorCollectService.CollectResult> collect(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate target = (date != null) ? date : LocalDate.now().minusWeeks(2);
        return ApiResponse.ok(visitorCollectService.collectWeek(target));
    }

    /**
     * GET /api/dev/visitors?week=2021-05-13&limit=20&order=asc
     * order=asc  → 외지인 방문자가 적은 순 (관광 소외 후보)
     * order=desc → 많은 순
     */
    @GetMapping
    public ApiResponse<Map<String, Object>> list(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(defaultValue = "asc") String order) {

        return ApiResponse.ok(visitorQueryService.findWeeklyRanking(week, limit, order));
    }
}
