package com.localpick.backend.domain.prediction;

import com.localpick.backend.domain.indicator.IndicatorCollectService;
import com.localpick.backend.global.response.ApiResponse;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

/** 지표 수집·예측 실행 확인용. local 프로파일 전용. */
@Profile("local")
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class PredictionDevController {

    private static final DateTimeFormatter YM = DateTimeFormatter.ofPattern("yyyyMM");

    private final IndicatorCollectService indicatorCollectService;
    private final PredictionService predictionService;

    /**
     * POST /api/dev/indicators/collect?ym=202104
     * 수요 강도·다양성 월간 지표 수집. 호출이 171회라 수 분 걸린다.
     */
    @PostMapping("/indicators/collect")
    public ApiResponse<IndicatorCollectService.CollectResult> collectIndicators(
            @RequestParam(required = false) String ym) {

        YearMonth month = (ym != null && !ym.isBlank())
                ? YearMonth.parse(ym, YM)
                : YearMonth.now().minusMonths(3);   // 공사 월간 지표는 두세 달 지연 공개된다

        return ApiResponse.ok(indicatorCollectService.collectMonth(month));
    }

    /**
     * POST /api/dev/predictions/run?date=2021-05-13
     * 해당 주의 소외도 예측을 계산해 저장한다. 같은 주를 다시 돌리면 덮어쓴다.
     */
    @PostMapping("/predictions/run")
    public ApiResponse<PredictionService.RunResult> run(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate target = (date != null) ? date : LocalDate.now().minusWeeks(2);
        return ApiResponse.ok(predictionService.run(target));
    }
}
