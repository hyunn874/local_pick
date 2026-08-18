package com.localpick.backend.domain.region;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 애플리케이션 기동 시 행정구역 마스터를 준비한다.
 *
 * 1) DB 가 비어 있으면 공사 방문자수 API 로 전국 시군구를 자동 생성한다.
 *    배포 환경에는 관리용 엔드포인트가 없으므로(@Profile("local")) 이 경로가 필요하다.
 * 2) regions.csv 를 읽어 인구·면적을 보충한다. 이미 있는 지역은 갱신만 한다.
 *
 * ApplicationRunner 를 쓰는 이유: @PostConstruct 는 트랜잭션 프록시가 적용되기 전에
 * 실행되어 @Transactional 이 동작하지 않는다. 변경 감지로 인한 UPDATE 가 커밋되지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RegionSeedLoader implements ApplicationRunner {

    private static final String CSV_PATH = "data/regions.csv";

    /** API 자동 생성 시 기준 날짜. 데이터가 확실히 존재하는 과거 시점을 사용한다. */
    private static final LocalDate SYNC_BASE_DATE = LocalDate.of(2021, 5, 13);

    private final RegionRepository regionRepository;
    private final RegionSyncService regionSyncService;

    @Override
    public void run(ApplicationArguments args) {
        ensureRegionsExist();
        loadCsv();
    }

    /** 지역이 하나도 없으면 공사 API 로 전국 시군구를 생성한다. */
    private void ensureRegionsExist() {
        long count = regionRepository.count();
        if (count > 0) {
            log.info("[RegionSeed] 기존 지역 {}건 확인 — 자동 생성을 건너뜁니다.", count);
            return;
        }

        log.info("[RegionSeed] 지역 데이터가 비어 있습니다. 공사 API 로 자동 생성을 시작합니다.");
        try {
            int created = regionSyncService.syncFromVisitorApi(SYNC_BASE_DATE);
            log.info("[RegionSeed] 자동 생성 완료 — {}건", created);
        } catch (Exception e) {
            log.error("[RegionSeed] 자동 생성 실패. 인증키와 네트워크를 확인하세요. ({})", e.getMessage());
            // 지역이 없어도 서버는 기동시킨다. 헬스체크와 나머지 기능은 동작해야 한다.
        }
    }

    @Transactional
    public void loadCsv() {
        List<RegionSeedRow> rows = readCsv();
        if (rows.isEmpty()) {
            log.warn("[RegionSeed] {} 에서 읽은 행이 없습니다. 인구·면적 보충을 건너뜁니다.", CSV_PATH);
            return;
        }

        int created = 0;
        int updated = 0;
        int withoutDensity = 0;

        for (RegionSeedRow row : rows) {
            Region region = regionRepository.findByRegionCode(row.regionCode())
                    .orElse(null);

            if (region == null) {
                region = Region.builder()
                        .regionCode(row.regionCode())
                        .sidoName(row.sidoName())
                        .sigunguName(row.sigunguName())
                        .centerLatitude(row.centerLatitude())
                        .centerLongitude(row.centerLongitude())
                        .build();
                created++;
            } else {
                updated++;
            }

            if (row.hasPopulationData()) {
                region.updatePopulation(row.population(), row.areaKm2());
            } else {
                withoutDensity++;
            }

            regionRepository.save(region);
        }

        log.info("[RegionSeed] CSV 반영 완료 — 신규 {}건, 갱신 {}건, 전체 {}건",
                created, updated, rows.size());
        if (withoutDensity > 0) {
            log.warn("[RegionSeed] 인구/면적 누락 {}건 — 해당 지역은 기본 채택 임계값(MEDIUM)이 적용됩니다.",
                    withoutDensity);
        }
    }

    private List<RegionSeedRow> readCsv() {
        List<RegionSeedRow> rows = new ArrayList<>();
        ClassPathResource resource = new ClassPathResource(CSV_PATH);

        if (!resource.exists()) {
            log.warn("[RegionSeed] {} 파일을 찾을 수 없습니다.", CSV_PATH);
            return rows;
        }

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {

            String line = reader.readLine(); // 헤더 스킵
            int lineNo = 1;

            while ((line = reader.readLine()) != null) {
                lineNo++;
                if (line.isBlank() || line.startsWith("#")) {
                    continue;
                }
                try {
                    RegionSeedRow row = RegionSeedRow.parse(line);
                    if (row.isValid()) {
                        rows.add(row);
                    } else {
                        log.warn("[RegionSeed] {}행 형식 오류로 건너뜀: {}", lineNo, line);
                    }
                } catch (RuntimeException e) {
                    log.warn("[RegionSeed] {}행 파싱 실패: {} ({})", lineNo, line, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.error("[RegionSeed] CSV 읽기 실패", e);
        }
        return rows;
    }
}
