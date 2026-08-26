package com.localpick.backend.infra.external.apple;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Apple identityToken(JWT) 검증기.
 *
 * nimbus-jose-jwt 없이 jjwt + java.security 로 직접 구현한다.
 * Render 512MB 환경에서 nimbus 의 JWKSourceBuilder 레이어 체인
 * (캐시, rate limiter, refresh-ahead 전용 스레드, 수백 개 클래스)이
 * 메모리를 과도하게 잡는 문제를 해결하기 위함.
 *
 * 캐시 정책:
 *   - TTL 24시간 — Apple 키는 거의 바뀌지 않는다.
 *   - kid 캐시 미스 시 재요청하므로 키 로테이션에도 안전하다.
 *   - fetch 실패 시 stale 캐시 반환 (outage tolerance).
 */
@Slf4j
@Component
public class AppleTokenVerifier {

    private static final String APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final long CACHE_TTL_MS = 24 * 60 * 60 * 1000L; // 24시간

    @Value("${localpick.apple.bundle-id:com.localpick.app}")
    private String bundleId;

    private final RestClient restClient = RestClient.create();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** kid → RSAPublicKey 캐시 */
    private final AtomicReference<Map<String, RSAPublicKey>> cachedKeys = new AtomicReference<>();
    private volatile long cacheTimestamp = 0;

    /**
     * identityToken 을 검증하고 Apple 사용자 ID(sub)를 반환한다.
     */
    public String verifyAndExtractSub(String identityToken) {
        // 1. JWT 헤더에서 kid, alg 추출
        String kid;
        String alg;
        try {
            String header = identityToken.split("\\.")[0];
            JsonNode headerNode = objectMapper.readTree(
                    Base64.getUrlDecoder().decode(header));
            kid = headerNode.get("kid").asText();
            alg = headerNode.get("alg").asText();
        } catch (Exception e) {
            log.error("[Apple] JWT 헤더 파싱 실패");
            throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
        }

        log.info("[Apple] 검증 시도 — alg={}, kid={}", alg, kid);

        if (!"RS256".equals(alg)) {
            log.error("[Apple] 지원하지 않는 알고리즘: {}", alg);
            throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
        }

        // 2. kid 에 매칭되는 RSA 공개키 조회
        RSAPublicKey publicKey = resolveKey(kid);
        if (publicKey == null) {
            log.error("[Apple] kid={} 에 매칭되는 Apple 공개키를 찾을 수 없습니다.", kid);
            throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
        }

        // 3. jjwt 로 서명 검증 + 클레임 확인
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(publicKey)
                    .requireIssuer(APPLE_ISSUER)
                    .requireAudience(bundleId)
                    .build()
                    .parseSignedClaims(identityToken)
                    .getPayload();

            String sub = claims.getSubject();
            if (sub == null || sub.isBlank()) {
                log.error("[Apple] 토큰에 sub 클레임이 없습니다.");
                throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
            }

            log.info("[Apple] 토큰 검증 성공 — sub 추출 완료");
            return sub;

        } catch (Exception e) {
            log.error("[Apple] identityToken 검증 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
        }
    }

    /**
     * kid 에 해당하는 RSA 공개키를 반환한다.
     * 캐시 히트 → 즉시 반환.
     * 캐시 미스 또는 TTL 만료 → Apple 에서 재요청.
     * 재요청 실패 → stale 캐시에서 조회 시도 (outage tolerance).
     */
    private RSAPublicKey resolveKey(String kid) {
        Map<String, RSAPublicKey> keys = cachedKeys.get();

        // 캐시가 유효하고 kid 가 있으면 즉시 반환
        if (keys != null && !isCacheExpired() && keys.containsKey(kid)) {
            return keys.get(kid);
        }

        // 캐시 미스 또는 만료 → Apple JWKS 재요청
        Map<String, RSAPublicKey> freshKeys = fetchAppleKeys();
        if (freshKeys != null) {
            cachedKeys.set(freshKeys);
            cacheTimestamp = System.currentTimeMillis();
            return freshKeys.get(kid);
        }

        // fetch 실패 → stale 캐시에서 조회 (outage tolerance)
        if (keys != null) {
            log.warn("[Apple] JWKS fetch 실패, stale 캐시 사용");
            return keys.get(kid);
        }

        return null;
    }

    private boolean isCacheExpired() {
        return System.currentTimeMillis() - cacheTimestamp > CACHE_TTL_MS;
    }

    /**
     * Apple JWKS 엔드포인트에서 공개키를 가져온다.
     * 실패 시 1회 재시도. 그래도 실패하면 null 반환.
     */
    private Map<String, RSAPublicKey> fetchAppleKeys() {
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                String body = restClient.get()
                        .uri(APPLE_JWKS_URL)
                        .retrieve()
                        .body(String.class);

                JsonNode jwks = objectMapper.readTree(body);
                JsonNode keysNode = jwks.get("keys");

                Map<String, RSAPublicKey> keyMap = new ConcurrentHashMap<>();
                KeyFactory keyFactory = KeyFactory.getInstance("RSA");

                for (JsonNode jwk : keysNode) {
                    if (!"RSA".equals(jwk.get("kty").asText())) continue;

                    String kid = jwk.get("kid").asText();
                    BigInteger n = new BigInteger(1,
                            Base64.getUrlDecoder().decode(jwk.get("n").asText()));
                    BigInteger e = new BigInteger(1,
                            Base64.getUrlDecoder().decode(jwk.get("e").asText()));

                    RSAPublicKey rsaKey = (RSAPublicKey) keyFactory.generatePublic(
                            new RSAPublicKeySpec(n, e));
                    keyMap.put(kid, rsaKey);
                }

                log.info("[Apple] JWKS fetch 성공 — {}개 키 로드", keyMap.size());
                return keyMap;

            } catch (Exception e) {
                log.warn("[Apple] JWKS fetch 실패 (시도 {}): {}", attempt + 1, e.getMessage());
            }
        }
        return null;
    }
}
