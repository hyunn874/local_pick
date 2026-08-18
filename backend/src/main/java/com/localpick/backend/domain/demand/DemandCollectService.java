package com.localpick.backend.domain.demand;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import com.localpick.backend.infra.external.kto.ExpenseIntensityItem;
import com.localpick.backend.infra.external.kto.KtoDemandClient;
import com.localpick.backend.infra.external.kto.StayIntensityItem;
import com.localpick.backend.infra.external.kto.TouristDiversityItem;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 수요 강도(35%) · 다양성(25%) 월간 수집.
 *
 * 지표 코드별로 따로 호출해야 해서 한 달에 9개 지표 × 19개 시도 = 171회 호출이 발생한다.
 * 월 1회만 돌리므로 감당 가능한 수준이다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DemandCollectService {

    private static final DateTimeFormatter YM = DateTimeFormatter.ofPattern("yyyyMM");

    private static final List<String> AGE_CODES =
            List.of("3101", "3102", "3103", "3104", "3105", "3106");

    private final KtoDemandClient demandClient;
    private final RegionRepository regionRepository;
    private final MonthlyDemandStatRepository statRepository;

    @Transactional
    public CollectResult collectMonth(YearMonth month) {
        String baseYm = month.format(YM);
        log.info("[DemandCollect] {} 수집 시작", baseYm);

        Map<String, MonthlyDemandStat> cache = new HashMap<>();
        int unmatched = 0;

        unmatched += collectStay(month, baseYm, cache);
        unmatched += collectExpense(month, baseYm, cache);
        unmatched += collectDiversity(month, baseYm, cache);

        statRepository.saveAll(cache.values());
        log.info("[DemandCollect] {} 완료 — 지역 {}건 저장, 미매칭 항목 {}건",
                baseYm, cache.size(), unmatched);

        if (cache.size() < 200) {
            log.warn("[DemandCollect] 매칭된 지역이 {}개뿐입니다. 지표가 시군구가 아니라 "
                    + "시도 단위로만 내려오는지 응답 원본을 확인하세요.", cache.size());
        }
        return new CollectResult(baseYm, cache.size(), unmatched);
    }

    /** 체류 강도 — 외지인 비중(2101), 숙박 비중(2102) */
    private int collectStay(YearMonth month, String baseYm, Map<String, MonthlyDemandStat> cache) {
        int unmatched = 0;

        for (StayIntensityItem it : demandClient.fetchAllStayIntensity(
                month, StayIntensityItem.IX_OUTSIDER_RATIO)) {
            MonthlyDemandStat stat = resolve(cache, it.signguCd(), baseYm);
            if (stat == null) { unmatched++; continue; }
            stat.updateStay(it.value(), null);
        }

        for (StayIntensityItem it : demandClient.fetchAllStayIntensity(
                month, StayIntensityItem.IX_LODGING_RATIO)) {
            MonthlyDemandStat stat = resolve(cache, it.signguCd(), baseYm);
            if (stat == null) { unmatched++; continue; }
            stat.updateStay(null, it.value());
        }
        return unmatched;
    }

    /**
     * 소비 강도 — 1인당 소비액(2203)만 쓴다.
     * 외지인 소비 총액(2201)은 방문자가 많을수록 커져서 방문자수(40%)와 거의 같은
     * 신호를 다시 세게 된다. 1인당 소비는 방문량과 독립적이라 중복이 없다.
     */
    private int collectExpense(YearMonth month, String baseYm, Map<String, MonthlyDemandStat> cache) {
        int unmatched = 0;
        for (ExpenseIntensityItem it : demandClient.fetchAllExpenseIntensity(
                month, ExpenseIntensityItem.IX_PER_VISITOR)) {
            MonthlyDemandStat stat = resolve(cache, it.signguCd(), baseYm);
            if (stat == null) { unmatched++; continue; }
            stat.updateExpense(it.value());
        }
        return unmatched;
    }

    /** 다양성 — 연령대별 방문객수(3101~3106) */
    private int collectDiversity(YearMonth month, String baseYm, Map<String, MonthlyDemandStat> cache) {
        int unmatched = 0;
        for (String code : AGE_CODES) {
            for (TouristDiversityItem it : demandClient.fetchAllTouristDiversity(month, code)) {
                MonthlyDemandStat stat = resolve(cache, it.signguCd(), baseYm);
                if (stat == null) { unmatched++; continue; }
                stat.updateAge(code, it.value());
            }
        }
        return unmatched;
    }

    // __RESOLVE__

    public record CollectResult(String baseYm, int savedRegions, int unmatchedItems) {}
}
