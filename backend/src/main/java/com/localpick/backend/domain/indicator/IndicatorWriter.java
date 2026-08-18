package com.localpick.backend.domain.indicator;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 수집된 지표를 DB 에 반영한다.
 *
 * IndicatorCollectService 안에 두지 않고 별도 빈으로 뺀 이유는 트랜잭션 경계 때문이다.
 * 같은 클래스 안에서 호출하면 프록시를 거치지 않아 @Transactional 이 걸리지 않고,
 * 상위 메서드에 트랜잭션을 걸면 수 분짜리 HTTP 호출이 커넥션을 붙잡는다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IndicatorWriter {

    private final RegionRepository regionRepository;
    private final MonthlyRegionIndicatorRepository indicatorRepository;

    @Transactional
    public WriteResult upsertAll(LocalDate baseYm, List<RegionIndicatorSnapshot> snapshots) {
        int saved = 0;
        int unmatched = 0;

        for (RegionIndicatorSnapshot snapshot : snapshots) {
            Region region = regionRepository.findByRegionCode(snapshot.regionCode()).orElse(null);
            if (region == null) {
                unmatched++;
                continue;
            }

            MonthlyRegionIndicator indicator = indicatorRepository
                    .findByRegionIdAndBaseYm(region.getId(), baseYm)
                    .orElseGet(() -> MonthlyRegionIndicator.builder()
                            .region(region)
                            .baseYm(baseYm)
                            .build());

            indicator.updateDemand(
                    snapshot.outsiderVisitRatio(),
                    snapshot.lodgingRatio(),
                    snapshot.expensePerVisitor());
            indicator.updateDiversity(snapshot.ageEvenness(), snapshot.ageSampleTotal());

            indicatorRepository.save(indicator);
            saved++;
        }

        if (unmatched > 0) {
            log.warn("[IndicatorWriter] 미매칭 {}건 — Region 마스터에 없는 시군구코드입니다.", unmatched);
        }
        return new WriteResult(saved, unmatched);
    }

    public record WriteResult(int saved, int unmatched) {}
}
