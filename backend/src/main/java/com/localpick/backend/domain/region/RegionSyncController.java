package com.localpick.backend.domain.region;

import com.localpick.backend.global.response.ApiResponse;
import java.time.LocalDate;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 행정구역 마스터 동기화용 관리 엔드포인트. local 프로파일 전용.
 * 최초 1회 실행해 229개 시군구를 생성한 뒤에는 사용할 일이 거의 없다.
 */
@Profile("local")
@RestController
@RequestMapping("/api/dev/regions")
@RequiredArgsConstructor
public class RegionSyncController {

    private final RegionSyncService regionSyncService;

    /** POST /api/dev/regions/sync?date=2021-05-13 */
    @PostMapping("/sync")
    public ApiResponse<Map<String, Object>> sync(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {

        LocalDate baseDate = (date != null) ? date : LocalDate.now().minusDays(30);
        int created = regionSyncService.syncFromVisitorApi(baseDate);

        return ApiResponse.ok(Map.of(
                "baseDate", baseDate.toString(),
                "created", created
        ));
    }
}
