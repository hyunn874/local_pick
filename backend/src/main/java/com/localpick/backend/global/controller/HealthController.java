package com.localpick.backend.global.controller;

import com.localpick.backend.global.response.ApiResponse;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    /**
     * 루트 접근 시 안내를 반환한다.
     *
     * 매핑이 없으면 NoResourceFoundException 이 전역 핸들러에 잡혀
     * "서버 오류가 발생했습니다" 로 표시된다. 배포 확인 시 오해를 부르므로
     * 사용 가능한 엔드포인트를 안내한다.
     */
    @GetMapping("/")
    public ApiResponse<Map<String, Object>> root() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("service", "LocalPick API");
        body.put("status", "running");
        body.put("time", LocalDateTime.now().toString());
        body.put("endpoints", List.of(
                "GET /actuator/health   서버 상태",
                "GET /api/ping          응답 확인",
                "GET /api/regions       행정구역 목록",
                "GET /api/regions/{code} 지역 상세",
                "GET /api/regions/search?sido=&sigungu= 행정구역명 조회"
        ));
        return ApiResponse.ok(body);
    }

    @GetMapping("/api/ping")
    public ApiResponse<Map<String, Object>> ping() {
        return ApiResponse.ok(Map.of(
                "service", "localpick",
                "time", LocalDateTime.now().toString()
        ));
    }
}
