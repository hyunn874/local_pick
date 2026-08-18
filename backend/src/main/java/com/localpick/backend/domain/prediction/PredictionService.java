package com.localpick.backend.domain.prediction;

import com.localpick.backend.domain.indicator.MonthlyRegionIndicator;
import com.localpick.backend.domain.indicator.MonthlyRegionIndicatorRepository;
import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.visitor.VisitorCollectService;
import com.localpick.backend.domain.visitor.WeeklyVisitorStat;
import com.localpick.backend.domain.visitor.WeeklyVisitorStatRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 주간 관광 소외 지역 예측.
 *
 *   총점 = 방문자수 40% + 수요 강도 35% + 다양성 25%
 *
 * 세 지표 모두 "낮을수록 소외"이므로 역방향으로 점수화한다. 방문자가 적고, 와도
 * 잠시 머물다 가고 돈을 안 쓰며, 특정 세대만 찾는 지역이 높은 점수를 받는다.
 *
 * 계산 대상은 그 주에 방문자수 집계가 있는 지역으로 한정한다. 방문자수가 40% 로 가장
 * 무겁기 때문에, 그 값이 없는 지역을 중립 50점으로 끼워 넣으면 데이터가 없다는 이유만으로
 * 순위에 오를 수 있다. 반대로 월간 지표는 없어도 중립 50점으로 채운다 — 방문자수라는
 * 근거가 이미 있는 지역이고, 지표 하나가 비었다고 탈락시키면 대상이 너무 줄어든다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PredictionService {

    /**
     * 수요 강도(35%) 내부 배분.
     * 외지인 비중을 가장 무겁게 둔 것은 "관광지로서 발견됐는가"에 가장 가까운 신호라서다.
     * 숙박 비중과 1인당 소비는 체류의 깊이를 보는 보조 지표로 동일 비중을 준다.
     */
    private static final double SUB_OUTSIDER_RATIO = 0.40;
    private static final double SUB_LODGING_RATIO = 0.30;
    private static final double SUB_EXPENSE_PER_VISITOR = 0.30;

    private final WeeklyVisitorStatRepository weeklyVisitorStatRepository;
    private final MonthlyRegionIndicatorRepository indicatorRepository;
    private final PredictionResultRepository predictionResultRepository;

    @Transactional
    public RunResult run(LocalDate anyDateInWeek) {
        LocalDate monday = VisitorCollectService.weekStartOf(anyDateInWeek);

        List<WeeklyVisitorStat> stats = weeklyVisitorStatRepository.findAllByWeekStartDate(monday).stream()
                .filter(s -> s.getDayCount() > 0)
                .toList();

        if (stats.isEmpty()) {
            log.warn("[Prediction] {} 주차 방문자수 집계가 없습니다. 수집을 먼저 실행하세요.", monday);
            return RunResult.empty(monday);
        }

        // ---------- 월간 지표 붙이기 ----------
        LocalDate indicatorBaseYm = indicatorRepository
                .findLatestBaseYmNotAfter(monday.withDayOfMonth(1))
                .orElse(null);

        Map<Long, MonthlyRegionIndicator> indicatorByRegion = new HashMap<>();
        if (indicatorBaseYm != null) {
            for (MonthlyRegionIndicator indicator : indicatorRepository.findAllByBaseYm(indicatorBaseYm)) {
                indicatorByRegion.put(indicator.getRegion().getId(), indicator);
            }
        } else {
            log.warn("[Prediction] {} 이전 월간 지표가 없습니다. 수요 강도·다양성은 전 지역 중립 50점으로 계산됩니다.",
                    monday);
        }

        // ---------- 원지표 수집 ----------
        Map<Long, Region> regionById = new LinkedHashMap<>();
        Map<Long, Double> visitorRaw = new HashMap<>();
        Map<Long, Double> outsiderRatioRaw = new HashMap<>();
        Map<Long, Double> lodgingRaw = new HashMap<>();
        Map<Long, Double> expenseRaw = new HashMap<>();
        Map<Long, Double> evennessRaw = new HashMap<>();

        for (WeeklyVisitorStat stat : stats) {
            Region region = stat.getRegion();
            Long regionId = region.getId();
            regionById.put(regionId, region);

            // 합계가 아니라 일평균을 쓴다. 수집 일수가 6일인 주와 7일인 주를 나란히 비교하면
            // 데이터가 하루 빈 지역이 소외 지역으로 잘못 잡힌다.
            visitorRaw.put(regionId, stat.dailyAverageOutsider());

            MonthlyRegionIndicator indicator = indicatorByRegion.get(regionId);
            if (indicator == null) {
                continue;
            }
            putIfPresent(outsiderRatioRaw, regionId, indicator.getOutsiderVisitRatio());
            putIfPresent(lodgingRaw, regionId, indicator.getLodgingRatio());
            putIfPresent(expenseRaw, regionId, indicator.getExpensePerVisitor());
            putIfPresent(evennessRaw, regionId, indicator.getAgeEvenness());
        }

        // ---------- 정규화 ----------
        Map<Long, Double> visitorScores = Normalizer.reverseScore(visitorRaw);
        Map<Long, Double> outsiderScores = Normalizer.reverseScore(outsiderRatioRaw);
        Map<Long, Double> lodgingScores = Normalizer.reverseScore(lodgingRaw);
        Map<Long, Double> expenseScores = Normalizer.reverseScore(expenseRaw);
        Map<Long, Double> diversityScores = Normalizer.reverseScore(evennessRaw);

        // ---------- 합산 & 저장 ----------
        List<PredictionResult> results = new ArrayList<>();
        int demandCovered = 0;
        int diversityCovered = 0;

        for (Map.Entry<Long, Region> entry : regionById.entrySet()) {
            Long regionId = entry.getKey();

            double visitorScore = visitorScores.getOrDefault(regionId, Normalizer.NEUTRAL);
            double demandScore = blendDemand(
                    outsiderScores.get(regionId),
                    lodgingScores.get(regionId),
                    expenseScores.get(regionId));
            Double diversity = diversityScores.get(regionId);
            double diversityScore = diversity != null ? diversity : Normalizer.NEUTRAL;

            if (outsiderScores.containsKey(regionId)
                    || lodgingScores.containsKey(regionId)
                    || expenseScores.containsKey(regionId)) {
                demandCovered++;
            }
            if (diversity != null) {
                diversityCovered++;
            }

            PredictionResult result = predictionResultRepository
                    .findByRegionIdAndWeekStartDate(regionId, monday)
                    .orElse(null);

            if (result == null) {
                result = PredictionResult.builder()
                        .region(entry.getValue())
                        .weekStartDate(monday)
                        .indicatorBaseYm(indicatorBaseYm)
                        .visitorScore(visitorScore)
                        .demandScore(demandScore)
                        .diversityScore(diversityScore)
                        .build();
            } else {
                result.updateScores(indicatorBaseYm, visitorScore, demandScore, diversityScore);
            }
            results.add(result);
        }

        // 총점 내림차순으로 순위 부여. 동점이면 지역 id 순으로 고정해 실행마다 순위가
        // 뒤바뀌지 않게 한다. id 는 LAZY 프록시에서도 추가 쿼리 없이 읽힐 수 있다.
        Comparator<PredictionResult> byScoreDesc =
                Comparator.comparingDouble(PredictionResult::getTotalScore).reversed();
        Comparator<PredictionResult> byRegionId =
                Comparator.comparingLong(r -> r.getRegion().getId());
        results.sort(byScoreDesc.thenComparing(byRegionId));

        for (int i = 0; i < results.size(); i++) {
            results.get(i).assignRanking(i + 1);
        }
        predictionResultRepository.saveAll(results);

        log.info("[Prediction] {} 주차 완료 — 대상 {}개 지역, 지표 기준월 {}, 수요 커버리지 {}, 다양성 커버리지 {}",
                monday, results.size(), indicatorBaseYm, demandCovered, diversityCovered);

        return new RunResult(monday, indicatorBaseYm, results.size(), demandCovered, diversityCovered);
    }

    /**
     * 수요 강도 세 하위 지표를 합친다.
     *
     * 각 하위 지표는 단위가 전부 달라(비중 %, 금액 원) 원값을 그대로 섞을 수 없으므로
     * 먼저 각각 백분위 점수로 바꾼 뒤 여기서 가중 평균한다. 일부가 비어 있으면 남은
     * 것들의 가중치를 다시 1로 맞춰 나눈다. 빠진 자리를 0으로 두면 자료가 부실한 지역이
     * 무조건 낮은 점수를 받게 된다.
     */
    private double blendDemand(Double outsiderScore, Double lodgingScore, Double expenseScore) {
        double weighted = 0.0;
        double weightSum = 0.0;

        if (outsiderScore != null) {
            weighted += outsiderScore * SUB_OUTSIDER_RATIO;
            weightSum += SUB_OUTSIDER_RATIO;
        }
        if (lodgingScore != null) {
            weighted += lodgingScore * SUB_LODGING_RATIO;
            weightSum += SUB_LODGING_RATIO;
        }
        if (expenseScore != null) {
            weighted += expenseScore * SUB_EXPENSE_PER_VISITOR;
            weightSum += SUB_EXPENSE_PER_VISITOR;
        }

        return weightSum > 0 ? weighted / weightSum : Normalizer.NEUTRAL;
    }

    private void putIfPresent(Map<Long, Double> target, Long regionId, Double value) {
        if (value != null) {
            target.put(regionId, value);
        }
    }

    public record RunResult(
            LocalDate weekStartDate,
            LocalDate indicatorBaseYm,
            int scoredRegions,
            int demandCoveredRegions,
            int diversityCoveredRegions
    ) {
        static RunResult empty(LocalDate weekStartDate) {
            return new RunResult(weekStartDate, null, 0, 0, 0);
        }
    }
}
