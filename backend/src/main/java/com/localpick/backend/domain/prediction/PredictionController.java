package com.localpick.backend.domain.prediction;

import com.localpick.backend.global.response.ApiResponse;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 관광 균등화 예측 화면용 공개 API. */
@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private static final int MAX_LIMIT = 100;

    private final PredictionQueryService predictionQueryService;

    /**
     * GET /api/predictions/featured
     * 홈 화면 "이 주의 발굴 지역" 3곳. week 를 생략하면 가장 최근 예측 주를 쓴다.
     */
    @GetMapping("/featured")
    public ApiResponse<PredictionResponse> featured(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week) {

        return ApiResponse.ok(predictionQueryService.findFeatured(week));
    }

    /**
     * GET /api/predictions?week=2021-05-10&limit=20
     * 예측 페이지 전체 소외도 순위.
     */
    @GetMapping
    public ApiResponse<PredictionResponse> ranking(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate week,
            @RequestParam(defaultValue = "20") int limit) {

        int safeLimit = Math.min(Math.max(limit, 1), MAX_LIMIT);
        return ApiResponse.ok(predictionQueryService.findRanking(week, safeLimit));
    }
}
