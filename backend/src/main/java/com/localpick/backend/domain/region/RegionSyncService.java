package com.localpick.backend.domain.region;

import com.localpick.backend.infra.external.kto.KtoDataLabClient;
import com.localpick.backend.infra.external.kto.RegionVisitorItem;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공사 API 응답으로 행정구역 마스터를 자동 구성한다.
 *
 * 방문자수 API 가 시군구코드와 시군구명을 함께 내려주므로,
 * 이를 이용해 229개 지역을 직접 입력하지 않고 생성한다.
 * 인구·면적은 API 에 없으므로 regions.csv 로 보충한다.
 *
 * 시도명은 시군구코드 앞 2자리로 판정한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RegionSyncService {

    private final KtoDataLabClient ktoDataLabClient;
    private final RegionRepository regionRepository;

    /** 시군구코드 앞 2자리 → 시도명 */
    private static final Map<String, String> SIDO_BY_PREFIX = Map.ofEntries(
            Map.entry("11", "서울특별시"),
            Map.entry("26", "부산광역시"),
            Map.entry("27", "대구광역시"),
            Map.entry("28", "인천광역시"),
            Map.entry("29", "광주광역시"),
            Map.entry("30", "대전광역시"),
            Map.entry("31", "울산광역시"),
            Map.entry("36", "세종특별자치시"),
            Map.entry("41", "경기도"),
            Map.entry("42", "강원특별자치도"),
            Map.entry("43", "충청북도"),
            Map.entry("44", "충청남도"),
            Map.entry("45", "전라북도"),
            Map.entry("46", "전라남도"),
            Map.entry("47", "경상북도"),
            Map.entry("48", "경상남도"),
            Map.entry("50", "제주특별자치도"),
            Map.entry("51", "강원특별자치도"),
            Map.entry("52", "전북특별자치도")
    );

    /**
     * 지정한 날짜의 방문자수 응답에서 시군구 목록을 추출해 Region 을 생성한다.
     * 이미 존재하는 지역은 건드리지 않는다 (인구·면적이 날아가지 않도록).
     *
     * @return 신규 생성된 지역 수
     */
    @Transactional
    public int syncFromVisitorApi(LocalDate baseDate) {
        List<RegionVisitorItem> items = ktoDataLabClient.fetchDailyVisitors(baseDate);

        // 시군구코드 기준으로 중복 제거 (관광객 구분별로 3건씩 오므로)
        Map<String, String> nameByCode = new LinkedHashMap<>();
        for (RegionVisitorItem item : items) {
            if (item.hasValidRegion()) {
                nameByCode.putIfAbsent(item.signguCode(), item.signguNm());
            }
        }

        log.info("[RegionSync] 응답 {}건에서 고유 시군구 {}개 추출", items.size(), nameByCode.size());

        int created = 0;
        int skipped = 0;
        int unknownSido = 0;

        for (Map.Entry<String, String> entry : nameByCode.entrySet()) {
            String code = entry.getKey();
            String name = entry.getValue();

            if (regionRepository.findByRegionCode(code).isPresent()) {
                skipped++;
                continue;
            }

            String sido = SIDO_BY_PREFIX.get(code.substring(0, 2));
            if (sido == null) {
                log.warn("[RegionSync] 알 수 없는 시도 코드: {} ({})", code, name);
                sido = "기타";
                unknownSido++;
            }

            regionRepository.save(Region.builder()
                    .regionCode(code)
                    .sidoName(sido)
                    .sigunguName(name)
                    .build());
            created++;
        }

        log.info("[RegionSync] 완료 — 신규 {}건, 기존 유지 {}건, 시도 미상 {}건",
                created, skipped, unknownSido);
        return created;
    }
}
