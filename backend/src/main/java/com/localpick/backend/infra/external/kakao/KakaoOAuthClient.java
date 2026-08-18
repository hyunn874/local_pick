package com.localpick.backend.infra.external.kakao;

import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * 카카오 OAuth 클라이언트.
 *
 * 인가코드 방식(A안)을 사용한다. 앱에서 받은 인가코드를 서버가 토큰으로 교환하므로
 * REST API 키가 서버에만 존재한다. 클라이언트가 준 토큰을 그대로 신뢰하는 구조보다 안전하다.
 */
@Slf4j
@Component
public class KakaoOAuthClient {

    private final RestClient restClient;
    private final String restApiKey;
    private final String clientSecret;
    private final String tokenUrl;
    private final String userInfoUrl;

    public KakaoOAuthClient(
            RestClient publicApiRestClient,
            @Value("${localpick.kakao.rest-api-key:}") String restApiKey,
            @Value("${localpick.kakao.client-secret:}") String clientSecret,
            @Value("${localpick.kakao.token-url}") String tokenUrl,
            @Value("${localpick.kakao.user-info-url}") String userInfoUrl) {
        this.restClient = publicApiRestClient;
        this.restApiKey = restApiKey;
        this.clientSecret = clientSecret;
        this.tokenUrl = tokenUrl;
        this.userInfoUrl = userInfoUrl;
    }

    /** 인가코드를 카카오 액세스 토큰으로 교환한다. */
    public KakaoTokenResponse exchangeCodeForToken(String code, String redirectUri) {
        requireKey();

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", restApiKey);
        form.add("redirect_uri", redirectUri);
        form.add("code", code);

        // 콘솔에서 클라이언트 시크릿을 "사용함"으로 두면 이 값이 없을 때
        // KOE010(Bad client credentials)이 발생한다.
        if (clientSecret != null && !clientSecret.isBlank()) {
            form.add("client_secret", clientSecret);
        }

        try {
            KakaoTokenResponse response = restClient.post()
                    .uri(tokenUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(KakaoTokenResponse.class);

            if (response == null || response.accessToken() == null) {
                log.error("[Kakao] 토큰 응답에 access_token 이 없습니다.");
                throw new BusinessException(ErrorCode.KAKAO_AUTH_FAILED);
            }
            return response;

        } catch (RestClientException e) {
            // 인가코드는 1회용이라 재사용하면 여기서 실패한다.
            log.error("[Kakao] 토큰 교환 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.KAKAO_AUTH_FAILED);
        }
    }

    /** 액세스 토큰으로 사용자 정보를 조회한다. */
    public KakaoUserResponse fetchUserInfo(String kakaoAccessToken) {
        try {
            KakaoUserResponse response = restClient.get()
                    .uri(userInfoUrl)
                    .header("Authorization", "Bearer " + kakaoAccessToken)
                    .retrieve()
                    .body(KakaoUserResponse.class);

            if (response == null || response.id() == null) {
                log.error("[Kakao] 사용자 정보에 id 가 없습니다.");
                throw new BusinessException(ErrorCode.KAKAO_AUTH_FAILED);
            }
            return response;

        } catch (RestClientException e) {
            log.error("[Kakao] 사용자 정보 조회 실패: {}", e.getMessage());
            throw new BusinessException(ErrorCode.KAKAO_AUTH_FAILED);
        }
    }

    private void requireKey() {
        if (restApiKey == null || restApiKey.isBlank()) {
            throw new IllegalStateException(
                    "카카오 REST API 키가 설정되지 않았습니다. "
                            + "application-local.yml 의 localpick.kakao.rest-api-key 또는 "
                            + "환경변수 KAKAO_REST_API_KEY 를 확인하세요.");
        }
    }
}
