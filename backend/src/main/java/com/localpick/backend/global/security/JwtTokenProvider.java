package com.localpick.backend.global.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * JWT 발급·검증.
 *
 * Access 2시간 / Refresh 14일.
 * 관광 앱 특성상 접속 간격이 길어 Access 를 짧게 두고 Refresh 로 조용히 갱신한다.
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private static final String CLAIM_TYPE = "type";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final String secret;
    private final long accessValiditySeconds;
    private final long refreshValiditySeconds;

    private SecretKey key;

    public JwtTokenProvider(
            @Value("${localpick.jwt.secret:}") String secret,
            @Value("${localpick.jwt.access-token-validity-seconds:7200}") long accessValiditySeconds,
            @Value("${localpick.jwt.refresh-token-validity-seconds:1209600}") long refreshValiditySeconds) {
        this.secret = secret;
        this.accessValiditySeconds = accessValiditySeconds;
        this.refreshValiditySeconds = refreshValiditySeconds;
    }

    @PostConstruct
    void init() {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "JWT secret 이 없거나 너무 짧습니다. 32바이트 이상이어야 합니다. "
                            + "application-local.yml 의 localpick.jwt.secret 또는 "
                            + "환경변수 JWT_SECRET 을 확인하세요.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(Long userId) {
        return createToken(userId, TYPE_ACCESS, accessValiditySeconds);
    }

    public String createRefreshToken(Long userId) {
        return createToken(userId, TYPE_REFRESH, refreshValiditySeconds);
    }

    private String createToken(Long userId, String type, long validitySeconds) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + validitySeconds * 1000);

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim(CLAIM_TYPE, type)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    /** 유효한 토큰이면 userId, 아니면 null */
    public Long parseUserId(String token) {
        Claims claims = parseClaims(token);
        if (claims == null) {
            return null;
        }
        try {
            return Long.valueOf(claims.getSubject());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Refresh 토큰으로 발급된 것인지 확인한다. Access 토큰으로 갱신 시도를 막는다. */
    public boolean isRefreshToken(String token) {
        Claims claims = parseClaims(token);
        return claims != null && TYPE_REFRESH.equals(claims.get(CLAIM_TYPE, String.class));
    }

    public boolean isAccessToken(String token) {
        Claims claims = parseClaims(token);
        return claims != null && TYPE_ACCESS.equals(claims.get(CLAIM_TYPE, String.class));
    }

    private Claims parseClaims(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException e) {
            log.debug("[JWT] 만료된 토큰");
            return null;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("[JWT] 유효하지 않은 토큰: {}", e.getMessage());
            return null;
        }
    }

    public long getAccessTokenValiditySeconds() {
        return accessValiditySeconds;
    }
}
