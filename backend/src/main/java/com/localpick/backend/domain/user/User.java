package com.localpick.backend.domain.user;

import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 회원.
 *
 * 카카오 로그인만으로는 닉네임 중복 여부와 세대 태그를 알 수 없으므로
 * 가입 직후에는 두 값이 비어 있다. 온보딩 단계에서 채운다.
 */
@Entity
@Getter
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 카카오 로그인 고유 식별자. Apple 전용 회원은 null 이다. */
    @Column(unique = true)
    private String kakaoId;

    /** Apple Sign In 고유 식별자. 카카오 전용 회원은 null 이다. */
    @Column(unique = true)
    private String appleId;

    /** 온보딩에서 설정. 서비스 내 고유해야 한다. */
    @Column(unique = true, length = 20)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private GenerationTag generationTag;

    /** 카카오에서 받은 프로필 이미지 URL (선택) */
    @Column(length = 500)
    private String profileImageUrl;

    /** 닉네임·세대 태그 설정을 마쳤는지 */
    @Column(nullable = false)
    private boolean onboarded;

    /**
     * 로컬패스 잔액 (조회용 캐시).
     * 정산 근거는 LocalPassHistory 이며, 증감은 반드시 이력과 같은 트랜잭션에서 처리한다.
     */
    @Column(nullable = false)
    private int localPassBalance;

    /** 가입 시 지급하는 로컬패스 */
    public static final int SIGNUP_BONUS = 5;

    @Builder
    private User(String kakaoId, String appleId, String profileImageUrl) {
        this.kakaoId = kakaoId;
        this.appleId = appleId;
        this.profileImageUrl = profileImageUrl;
        this.onboarded = false;
        this.localPassBalance = 0;
    }

    /** 온보딩 완료 — 닉네임과 세대 태그를 확정한다. */
    public void completeOnboarding(String nickname, GenerationTag generationTag) {
        this.nickname = nickname;
        this.generationTag = generationTag;
        this.onboarded = true;
    }

    public void changeNickname(String nickname) {
        this.nickname = nickname;
    }

    public void changeGenerationTag(GenerationTag generationTag) {
        this.generationTag = generationTag;
    }

    public void updateProfileImage(String profileImageUrl) {
        this.profileImageUrl = profileImageUrl;
    }

    /** LocalPassService 를 통해서만 호출한다. */
    public void applyLocalPassDelta(int delta) {
        this.localPassBalance += delta;
    }

    public boolean canAfford(int amount) {
        return this.localPassBalance >= amount;
    }
}
