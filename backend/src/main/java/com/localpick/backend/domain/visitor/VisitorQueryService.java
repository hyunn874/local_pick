package com.localpick.backend.domain.visitor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 방문자수 집계 조회.
 *
 * Region 은 LAZY 연관이라 컨트롤러에서 접근하면 세션이 닫힌 뒤라 실패한다
 * (open-in-view: false). 따라서 트랜잭션 경계 안에서 DTO 로 변환해 반환한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VisitorQueryService {

    private final WeeklyVisitorStatRepository weeklyVisitorStatRepository;

    public Map<String, Object> findWeeklyRanking(LocalDate week, int limit, String order) {
        LocalDate monday = VisitorCollectService.weekStartOf(week);
        List<WeeklyVisitorStat> stats =
                new ArrayList<>(weeklyVisitorStatRepository.findAllByWeekStartDate(monday));

        Comparator<WeeklyVisitorStat> comparator =
                Comparator.comparingDouble(WeeklyVisitorStat::getOutsiderCount);
        if ("desc".equalsIgnoreCase(order)) {
            comparator = comparator.reversed();
        }
        stats.sort(comparator);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (WeeklyVisitorStat s : stats.stream().limit(limit).toList()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("region", s.getRegion().getFullName());   // 트랜잭션 안이므로 안전
            row.put("outsider", Math.round(s.getOutsiderCount()));
            row.put("local", Math.round(s.getLocalCount()));
            row.put("foreigner", Math.round(s.getForeignerCount()));
            row.put("outsiderRatio", Math.round(s.outsiderRatio() * 1000) / 10.0);
            row.put("days", s.getDayCount());
            rows.add(row);
        }

        long incompleteCount = stats.stream().filter(s -> !s.isComplete()).count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("weekStartDate", monday.toString());
        result.put("totalRegions", stats.size());
        result.put("incompleteRegions", incompleteCount);
        result.put("order", order);
        result.put("regions", rows);
        return result;
    }
}
