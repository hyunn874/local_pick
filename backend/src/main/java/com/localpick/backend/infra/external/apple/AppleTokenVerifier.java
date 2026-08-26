package com.localpick.backend.infra.external.apple;

import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.BadJOSEException;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.proc.ConfigurableJWTProcessor;
import com.nimbusds.jwt.proc.DefaultJWTClaimsVerifier;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URL;
import java.text.ParseException;
import java.util.Set;
import java.util.concurrent.TimeUnit;

/**
 * Apple identityToken(JWT) 검증기.
 *
 * Apple 공개키(JWK Set)를 캐싱하고, 서명·iss·aud·exp 를 검증한 뒤 sub 를 반환한다.
 *
 * 캐시 정책:
 *   - TTL 24시간 — Apple 키는 거의 바뀌지 않는다.
 *   - kid 미스매치 시 자동 재요청하므로 키 로테이션에도 안전하다.
 *   - Render 무료 티어 네트워크 불안정 대비 retry 1회, outage tolerance 활성화.
 */
@Slf4j
@Component
public class AppleTokenVerifier {

    private static final String APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";

    @Value("${localpick.apple.bundle-id:com.localpick.app}")
    private String bundleId;

    private ConfigurableJWTProcessor<SecurityContext> jwtProcessor;

    @PostConstruct
    void init() {
        try {
            JWKSource<SecurityContext> keySource = JWKSourceBuilder
                    .create(new URL(APPLE_JWKS_URL))
                    .cache(TimeUnit.HOURS.toMillis(24), TimeUnit.HOURS.toMillis(1))
                    .retrying(true)
                    .outageTolerant(true)
                    .build();

            // DefaultJWTProcessor 기본 타입 검증기가 typ:"JWT" 과 null 모두 허용한다.
            // setJWSTypeVerifier 를 호출하지 않는다 — no-arg 생성자는 null 만 허용해서
            // Apple 이 typ 헤더를 추가하면 깨진다.
            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSKeySelector(
                    new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource));

            processor.setJWTClaimsSetVerifier(new DefaultJWTClaimsVerifier<>(
                    new JWTClaimsSet.Builder()
                            .issuer(APPLE_ISSUER)
                            .audience(bundleId)
                            .build(),
                    Set.of("sub", "iss", "aud", "exp", "iat")));

            this.jwtProcessor = processor;
            log.info("[Apple] JWT 검증기 초기화 완료 — bundleId={}", bundleId);

        } catch (Exception e) {
            log.warn("[Apple] JWT 검증기 초기화 중 경고: {}", e.getMessage());
        }
    }

    /**
     * identityToken 을 검증하고 Apple 사용자 ID(sub)를 반환한다.
     */
    public String verifyAndExtractSub(String identityToken) {
        if (jwtProcessor == null) {
            log.error("[Apple] JWT 검증기가 초기화되지 않았습니다.");
            throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
        }

        // 디버그용: JWT 헤더의 alg, kid 기록 (토큰 값 자체는 찍지 않는다)
        try {
            JWSHeader header = SignedJWT.parse(identityToken).getHeader();
            log.error("[Apple] 검증 시도 — alg={}, kid={}", header.getAlgorithm(), header.getKeyID());
        } catch (ParseException e) {
            log.error("[Apple] JWT 헤더 파싱 실패");
        }

        try {
            JWTClaimsSet claims = jwtProcessor.process(identityToken, null);
            String sub = claims.getSubject();

            if (sub == null || sub.isBlank()) {
                log.error("[Apple] 토큰에 sub 클레임이 없습니다.");
                throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
            }

            log.info("[Apple] 토큰 검증 성공 — sub 추출 완료");
            return sub;

        } catch (ParseException | BadJOSEException | JOSEException e) {
            log.error("[Apple] identityToken 검증 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
        }
    }
}
