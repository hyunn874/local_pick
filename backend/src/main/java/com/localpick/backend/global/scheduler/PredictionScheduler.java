package com.localpick.backend.global.scheduler;

import com.localpick.backend.domain.indicator.IndicatorCollectService;
import com.localpick.backend.domain.prediction.PredictionService;
import com.localpick.backend.domain.visitor.VisitorCollectService;
import java.time.LocalDate;
import java.time.YearMonth;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 주간 예측 파이프라인 자동 실행.
 *
 * 두 가지 가드를 겹쳐 쓴다. 역할이 다르기 때문이다.
 *   @Profile("!local")           — 로컬 개발 중 171회 API 호출이 실수로 나가는 것을 막는 안전장치.
 *                                  IDE 에서 prod 프로파일을 지정해도 이 빈은 생성되지 않는다.
 *   @ConditionalOnProperty       — 배포 환경(prod/staging)에서 on/off 를 yml 로 조절하는 스위치.
 *                                  기본값은 false(꺼짐). application-prod.yml 에서만 true 로 켠다.
 *
 * 시간대를 Asia/Seoul 로 못박은 것은 Render 컨테이너가 UTC 로 돌기 때문이다.
 * 지정하지 않으면 화요일 새벽 작업이 월요일 낮에 도는 셈이 된다.
 */
@Slf4j
@Component
@Profile("!local")
@ConditionalOnProperty(name = "localpick.scheduler.enabled", havingValue = "true")
public class PredictionScheduler {

    private static final String ZONE = "Asia/Seoul";

    private final VisitorCollectService visitorCollectService;
    private final IndicatorCollectService indicatorCollectService;
    private final PredictionService predictionService;

    /**
     * 공사 방문자수 API 의 공개 지연(주). 오늘 기준으로 몇 주 전 데이터를 받을지 정한다.
     * 실제 지연은 운영하며 확인해 조정한다.
     */
    private final int visitorLagWeeks;

    /** 공사 월간 지표의 공개 지연(월). */
    private final int indicatorLagMonths;

    public PredictionScheduler(VisitorCollectService visitorCollectService,
                               IndicatorCollectService indicatorCollectService,
                               PredictionService predictionService,
                               @Value("${localpick.scheduler.visitor-lag-weeks:2}") int visitorLagWeeks,
                               @Value("${localpick.scheduler.indicator-lag-months:3}") int indicatorLagMonths) {
        this.visitorCollectService = visitorCollectService;
        this.indicatorCollectService = indicatorCollectService;
        this.predictionService = predictionService;
        this.visitorLagWeeks = visitorLagWeeks;
        this.indicatorLagMonths = indicatorLagMonths;
    }

    /**
     * 매주 화요일 새벽 4시 — 방문자수 수집 후 예측 재계산.
     *
     * 월요일이 아니라 화요일로 잡은 이유 두 가지.
     * (1) 공사 DataLab API 는 주말~월요일 초에 갱신 지연이 잦다. 화요일이면 그 지연이
     *     대부분 해소된 시점이라 전 주 데이터를 온전히 받을 확률이 높다.
     * (2) 실패 시 화~금 사이에 수동 재실행 여유가 4일 남는다. 월요일에 돌리면
     *     한 주 내내 기다려야 다음 기회가 온다.
     *
     * 수집과 예측을 한 메서드에 묶은 것은 순서가 반드시 지켜져야 하기 때문이다.
     * 수집이 실패하면 예측은 돌리지 않는다. 직전 주 결과를 그대로 두는 편이,
     * 절반만 채워진 데이터로 순위를 새로 뽑는 것보다 낫다.
     */
    @Scheduled(cron = "0 0 4 * * TUE", zone = ZONE)
    public void runWeekly() {
        LocalDate target = LocalDate.now().minusWeeks(visitorLagWeeks);
        log.info("[Scheduler] 주간 파이프라인 시작 — 대상 주 {}", VisitorCollectService.weekStartOf(target));

        try {
            VisitorCollectService.CollectResult collected = visitorCollectService.collectWeek(target);
            if (collected.savedRegions() == 0) {
                log.warn("[Scheduler] 방문자수 수집 결과가 0건이라 예측을 건너뜁니다.");
                return;
            }

            PredictionService.RunResult result = predictionService.run(target);
            log.info("[Scheduler] 주간 파이프라인 완료 — {}개 지역 점수화", result.scoredRegions());

        } catch (Exception e) {
            log.error("[Scheduler] 주간 파이프라인 실패: {}", e.getMessage(), e);
        }
    }

    /**
     * 매월 5일 새벽 3시 — 월간 수요 강도·다양성 수집.
     *
     * 주간 작업보다 하루 앞선 시간대에 두어 둘이 겹치지 않게 한다.
     * 호출이 171회라 무료 인스턴스에서 수 분 걸린다.
     */
    @Scheduled(cron = "0 0 3 5 * *", zone = ZONE)
    public void runMonthly() {
        YearMonth target = YearMonth.now().minusMonths(indicatorLagMonths);
        log.info("[Scheduler] 월간 지표 수집 시작 — 대상 월 {}", target);

        try {
            IndicatorCollectService.CollectResult result = indicatorCollectService.collectMonth(target);
            log.info("[Scheduler] 월간 지표 수집 완료 — {}개 지역", result.savedRegions());
        } catch (Exception e) {
            log.error("[Scheduler] 월간 지표 수집 실패: {}", e.getMessage(), e);
        }
    }
}
