package com.localpick.backend.infra.external.apple;

import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.BadJOSEException;
import com.nimbusds.jose.proc.DefaultJOSEObjectTypeVerifier;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
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

/**
 * Apple identityToken(JWT) 검증기.
 *
 * Apple 공개키(JWK Set)를 캐싱하고, 서명·iss·aud·exp 를 검증한 뒤 sub 를 반환한다.
 * kid 불일치 시 Apple 서버에 자동 재요청하므로 키 로테이션에도 안전하다.
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
                    .build();

            ConfigurableJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
            processor.setJWSTypeVerifier(new DefaultJOSEObjectTypeVerifier<>());
            processor.setJWSKeySelector(
                    new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource));

            // iss, aud, exp, sub 자동 검증
            processor.setJWTClaimsSetVerifier(new DefaultJWTClaimsVerifier<>(
                    new JWTClaimsSet.Builder()
                            .issuer(APPLE_ISSUER)
                            .audience(bundleId)
                            .build(),
                    Set.of("sub", "iss", "aud", "exp", "iat")));

            this.jwtProcessor = processor;
            log.info("[Apple] JWT 검증기 초기화 완료 — bundleId={}", bundleId);

        } catch (Exception e) {
            // 시작 시 Apple 에 못 닿아도 실패하지 않는다. 첫 검증 시점에 재시도된다.
            log.warn("[Apple] JWT 검증기 초기화 중 경고: {}", e.getMessage());
        }
    }

    /**
     * identityToken 을 검증하고 Apple 사용자 ID(sub)를 반환한다.
     */
    public String verifyAndExtractSub(String identityToken) {
        if (jwtProcessor == null) {
            throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
        }

        try {
            JWTClaimsSet claims = jwtProcessor.process(identityToken, null);
            String sub = claims.getSubject();

            if (sub == null || sub.isBlank()) {
                log.error("[Apple] 토큰에 sub 클레임이 없습니다.");
                throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
            }

            return sub;

        } catch (ParseException | BadJOSEException | JOSEException e) {
            log.error("[Apple] identityToken 검증 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.APPLE_AUTH_FAILED);
        }
    }
}
