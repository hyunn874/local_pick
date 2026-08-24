package com.localpick.backend.domain.indicator;

import com.localpick.backend.infra.external.kto.ExpenseIntensityItem;
import com.localpick.backend.infra.external.kto.KtoDemandClient;
import com.localpick.backend.infra.external.kto.StayIntensityItem;
import com.localpick.backend.infra.external.kto.TouristDiversityItem;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 월간 수요 강도(35%)·다양성(25%) 지표를 공사 API 에서 받아 지역·월 단위로 저장한다.
 *
 * 호출량이 방문자수보다 훨씬 크다. 이 API 들은 areaCd(시도) 가 필수라 19회 순회해야 하고,
 * 지표 코드도 한 번에 하나만 지정할 수 있다.
 *   체류 2종 × 19 + 소비 1종 × 19 + 연령 6종 × 19 = 171 회
 * 월 1회만 도는 작업이라 감수할 만하지만, 재시도를 남발하면 일일 트래픽 한도에 걸린다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IndicatorCollectService {

    /** 다양성 계산에 쓰는 연령대 지표 코드 (10대~60대) */
    private static final List<String> AGE_CODES = List.of(
            TouristDiversityItem.IX_TEENS,
            TouristDiversityItem.IX_TWENTIES,
            TouristDiversityItem.IX_THIRTIES,
            TouristDiversityItem.IX_FORTIES,
            TouristDiversityItem.IX_FIFTIES,
            TouristDiversityItem.IX_SIXTIES
    );

    private static final double MAX_ENTROPY = Math.log(6);

    private final KtoDemandClient ktoDemandClient;
    private final IndicatorWriter indicatorWriter;

    /**
     * 지정한 월의 지표를 수집해 저장한다.
     * HTTP 구간과 DB 구간을 분리하기 위해 이 메서드 자체에는 트랜잭션을 걸지 않는다.
     */
    public CollectResult collectMonth(YearMonth month) {
        LocalDate baseYm = MonthlyRegionIndicator.toBaseYm(month);
        log.info("[IndicatorCollect] {} 수집 시작 — baseYm={}, 예상 호출 171회", month, baseYm);

        Map<String, Double> outsiderRatio = fetchStay(month, StayIntensityItem.IX_OUTSIDER_RATIO);
        Map<String, Double> lodgingRatio = fetchStay(month, StayIntensityItem.IX_LODGING_RATIO);
        Map<String, Double> expensePerVisitor = fetchExpense(month, ExpenseIntensityItem.IX_PER_VISITOR);
        Map<String, Map<String, Double>> ageCounts = fetchAgeDistribution(month);

        Set<String> codes = new LinkedHashSet<>();
        codes.addAll(outsiderRatio.keySet());
        codes.addAll(lodgingRatio.keySet());
        codes.addAll(expensePerVisitor.keySet());
        codes.addAll(ageCounts.keySet());

        List<RegionIndicatorSnapshot> snapshots = new ArrayList<>();
        for (String code : codes) {
            Map<String, Double> ages = ageCounts.get(code);
            double total = ages == null ? 0.0 : ages.values().stream().mapToDouble(Double::doubleValue).sum();
            Double evenness = (ages == null || total <= 0) ? null : evenness(ages, total);

            snapshots.add(new RegionIndicatorSnapshot(
                    code,
                    outsiderRatio.get(code),
                    lodgingRatio.get(code),
                    expensePerVisitor.get(code),
                    evenness,
                    total > 0 ? total : null
            ));
        }

        IndicatorWriter.WriteResult written = indicatorWriter.upsertAll(baseYm, snapshots);

        log.info("[IndicatorCollect] {} 완료 — 지역 {}건 저장, 미매칭 {}건",
                month, written.saved(), written.unmatched());

        return new CollectResult(baseYm, written.saved(), written.unmatched(), snapshots.size());
    }

    // ---------- 수집 ----------

    private Map<String, Double> fetchStay(YearMonth month, String indexCode) {
        Map<String, Double> result = new HashMap<>();
        for (StayIntensityItem item : ktoDemandClient.fetchAllStayIntensity(month, indexCode)) {
            if (item.hasValidRegion()) {
                result.put(item.signguCd(), item.value());
            }
        }
        return result;
    }

    private Map<String, Double> fetchExpense(YearMonth month, String indexCode) {
        Map<String, Double> result = new HashMap<>();
        for (ExpenseIntensityItem item : ktoDemandClient.fetchAllExpenseIntensity(month, indexCode)) {
            if (item.hasValidRegion()) {
                result.put(item.signguCd(), item.value());
            }
        }
        return result;
    }

    /** 지역코드 → (연령지표코드 → 방문객수) */
    private Map<String, Map<String, Double>> fetchAgeDistribution(YearMonth month) {
        Map<String, Map<String, Double>> result = new HashMap<>();
        for (String ageCode : AGE_CODES) {
            for (TouristDiversityItem item : ktoDemandClient.fetchAllTouristDiversity(month, ageCode)) {
                if (!item.hasValidRegion()) {
                    continue;
                }
                result.computeIfAbsent(item.signguCd(), k -> new LinkedHashMap<>())
                        .put(ageCode, item.value());
            }
        }
        return result;
    }

    // ---------- 다양성 계산 ----------

    /**
     * 연령 분포의 균등도. 섀넌 엔트로피를 최대 엔트로피 ln(6) 으로 나눠 0~1 로 만든다.
     *
     * 연령대별 방문객수를 그대로 비교하지 않고 분포 모양만 보는 이유는, 방문객 규모는
     * 이미 방문자수 지표(40%)가 담당하고 있기 때문이다. 여기서 보고 싶은 것은
     * "특정 세대만 오는 곳인가, 전 세대가 고루 오는 곳인가" 다.
     */
    private double evenness(Map<String, Double> ageCounts, double total) {
        double entropy = 0.0;
        for (String ageCode : AGE_CODES) {
            double count = ageCounts.getOrDefault(ageCode, 0.0);
            if (count <= 0) {
                continue;   // p·ln(p) 는 p→0 에서 0 으로 수렴한다
            }
            double p = count / total;
            entropy -= p * Math.log(p);
        }
        double value = entropy / MAX_ENTROPY;
        return Math.max(0.0, Math.min(1.0, value));
    }

    public record CollectResult(
            LocalDate baseYm,
            int savedRegions,
            int unmatchedRegions,
            int sourceRegionCount
    ) {}
}
