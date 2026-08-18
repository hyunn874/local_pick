package com.localpick.backend.infra.external.kakao;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 카카오 사용자 정보 응답 (kapi.kakao.com/v2/user/me)
 *
 * 동의항목 설정에 따라 properties 나 kakao_account 가 비어 올 수 있으므로
 * 모든 접근에 null 방어가 필요하다.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record KakaoUserResponse(
        Long id,
        @JsonProperty("kakao_account") KakaoAccount kakaoAccount,
        Properties properties
) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KakaoAccount(
            Profile profile,
            String email,
            @JsonProperty("age_range") String ageRange
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Profile(
            String nickname,
            @JsonProperty("profile_image_url") String profileImageUrl,
            @JsonProperty("thumbnail_image_url") String thumbnailImageUrl
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Properties(
            String nickname,
            @JsonProperty("profile_image") String profileImage,
            @JsonProperty("thumbnail_image") String thumbnailImage
    ) {}

    /** 카카오 회원번호. 우리 서비스의 kakaoId 로 사용한다. */
    public String kakaoId() {
        return id == null ? null : String.valueOf(id);
    }

    /** 프로필 이미지. 동의항목에 따라 없을 수 있다. */
    public String profileImageUrl() {
        if (kakaoAccount != null && kakaoAccount.profile() != null
                && kakaoAccount.profile().profileImageUrl() != null) {
            return kakaoAccount.profile().profileImageUrl();
        }
        if (properties != null) {
            return properties.profileImage();
        }
        return null;
    }

    /**
     * 카카오 닉네임. 참고용으로만 쓴다.
     * 중복 가능성이 있어 서비스 닉네임으로 바로 쓰지 않고 온보딩에서 다시 받는다.
     */
    public String kakaoNickname() {
        if (kakaoAccount != null && kakaoAccount.profile() != null
                && kakaoAccount.profile().nickname() != null) {
            return kakaoAccount.profile().nickname();
        }
        if (properties != null) {
            return properties.nickname();
        }
        return null;
    }
}
