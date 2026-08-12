package com.localpick.backend.domain.visitor;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import com.localpick.backend.infra.external.kto.KtoDataLabClient;
import com.localpick.backend.infra.external.kto.RegionVisitorItem;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공사 API 에서 일별 방문자수를 받아 주간 단위로 집계·저장한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class VisitorCollectService {

    private final KtoDataLabClient ktoDataLabClient;
    private final RegionRepository regionRepository;
    private final WeeklyVisitorStatRepository weeklyVisitorStatRepository;

    /** 임의 날짜가 속한 주의 월요일 */
    public static LocalDate weekStartOf(LocalDate date) {
        return date.with(DayOfWeek.MONDAY);
    }

    /**
     * 지정한 주(월~일)의 방문자수를 수집해 집계 저장한다.
     *
     * @param anyDateInWeek 해당 주에 속하는 아무 날짜
     * @return 저장된 지역 수
     */
    @Transactional
    public CollectResult collectWeek(LocalDate anyDateInWeek) {
        LocalDate monday = weekStartOf(anyDateInWeek);
        LocalDate sunday = monday.plusDays(6);

        log.info("[VisitorCollect] {} ~ {} 수집 시작", monday, sunday);

        List<RegionVisitorItem> items = ktoDataLabClient.fetchVisitors(monday, sunday);
        if (items.isEmpty()) {
            log.warn("[VisitorCollect] 응답이 비었습니다. 해당 기간 데이터가 없을 수 있습니다.");
            return new CollectResult(monday, 0, 0, 0);
        }

        // 시군구코드별 집계
        Map<String, Accumulator> byCode = new HashMap<>();
        for (RegionVisitorItem item : items) {
            if (!item.hasValidRegion()) {
                continue;
            }
            byCode.computeIfAbsent(item.signguCode(), k -> new Accumulator())
                    .add(item);
        }

        int saved = 0;
        int unmatched = 0;

        for (Map.Entry<String, Accumulator> entry : byCode.entrySet()) {
            Region region = regionRepository.findByRegionCode(entry.getKey()).orElse(null);
            if (region == null) {
                unmatched++;
                continue;
            }

            Accumulator acc = entry.getValue();
            WeeklyVisitorStat stat = weeklyVisitorStatRepository
                    .findByRegionIdAndWeekStartDate(region.getId(), monday)
                    .orElse(null);

            if (stat == null) {
                stat = WeeklyVisitorStat.builder()
                        .region(region)
                        .weekStartDate(monday)
                        .outsiderCount(acc.outsider)
                        .localCount(acc.local)
                        .foreignerCount(acc.foreigner)
                        .dayCount(acc.days.size())
                        .build();
            } else {
                stat.update(acc.outsider, acc.local, acc.foreigner, acc.days.size());
            }
            weeklyVisitorStatRepository.save(stat);
            saved++;
        }

        log.info("[VisitorCollect] 완료 — 원본 {}건 → 지역 {}건 저장, 미매칭 {}건",
                items.size(), saved, unmatched);

        if (unmatched > 0) {
            log.warn("[VisitorCollect] 미매칭 {}건은 Region 마스터에 없는 시군구코드입니다. "
                    + "/api/dev/regions/sync 로 지역을 먼저 갱신하세요.", unmatched);
        }

        return new CollectResult(monday, saved, unmatched, items.size());
    }

    /** 지역 한 곳의 주간 누계를 담는 임시 누산기 */
    private static class Accumulator {
        double outsider;
        double local;
        double foreigner;
        final Set<String> days = new HashSet<>();

        void add(RegionVisitorItem item) {
            double count = item.visitorCount();
            switch (item.touDivCd()) {
                case RegionVisitorItem.TOU_DIV_OUTSIDER -> outsider += count;
                case RegionVisitorItem.TOU_DIV_LOCAL -> local += count;
                case RegionVisitorItem.TOU_DIV_FOREIGNER -> foreigner += count;
                default -> { /* 알 수 없는 구분은 무시 */ }
            }
            if (item.baseYmd() != null) {
                days.add(item.baseYmd());
            }
        }
    }

    public record CollectResult(
            LocalDate weekStartDate,
            int savedRegions,
            int unmatchedRegions,
            int sourceItemCount
    ) {}
}
