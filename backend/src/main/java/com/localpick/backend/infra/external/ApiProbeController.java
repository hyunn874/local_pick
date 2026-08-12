package com.localpick.backend.infra.external;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.HashMap;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 공공 API 규격 탐색용 임시 엔드포인트. local 프로파일에서만 동작한다.
 * 응답 형식을 파악한 뒤에는 삭제한다.
 *
 * 예) /api/dev/probe?url=https://apis.data.go.kr/B551011/...&numOfRows=5
 */
@Profile("local")
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
public class ApiProbeController {

    private static final String PARAM_URL = "url";
    private static final String PARAM_TARGET = "target";

    private final PublicApiClient publicApiClient;

    @GetMapping(value = "/probe", produces = MediaType.TEXT_PLAIN_VALUE + ";charset=UTF-8")
    public ResponseEntity<String> probe(@RequestParam Map<String, String> allParams) {
        String url = allParams.get(PARAM_URL);
        if (url == null || url.isBlank()) {
            return ResponseEntity.badRequest().body("""
                    url 파라미터가 필요합니다.

                    예시:
                      /api/dev/probe?url=https://apis.data.go.kr/B551011/서비스명/오퍼레이션명&numOfRows=5

                    target=mois 를 붙이면 행정안전부 인증키로 호출합니다.
                    """);
        }

        String target = allParams.getOrDefault(PARAM_TARGET, "kto");

        Map<String, String> params = new HashMap<>(allParams);
        params.remove(PARAM_URL);
        params.remove(PARAM_TARGET);

        try {
            String body = "mois".equalsIgnoreCase(target)
                    ? publicApiClient.callMois(url, params)
                    : publicApiClient.callKto(url, params);

            return ResponseEntity.ok(body == null ? "(응답 본문 없음)" : body);

        } catch (Exception e) {
            return ResponseEntity.status(502).body(
                    "호출 실패\n"
                            + "예외: " + e.getClass().getName() + "\n"
                            + "메시지: " + e.getMessage() + "\n\n"
                            + stackTrace(e));
        }
    }

    private String stackTrace(Exception e) {
        StringWriter sw = new StringWriter();
        e.printStackTrace(new PrintWriter(sw));
        String full = sw.toString();
        return full.length() > 2000 ? full.substring(0, 2000) + "\n..." : full;
    }
}
