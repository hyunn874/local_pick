package com.localpick.backend.domain.user;

import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(name = "users")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 카카오 로그인 고유 식별자 */
    @Column(nullable = false, unique = true)
    private String kakaoId;

    @Column(nullable = false, length = 20)
    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GenerationTag generationTag;

    /**
     * 로컬패스 잔액 (조회용 캐시).
     * 실제 정산 근거는 LocalPassHistory 이며, 증감은 반드시 이력과 같은 트랜잭션에서 처리한다.
     */
    @Column(nullable = false)
    private int localPassBalance;

    @Builder
    private User(String kakaoId, String nickname, GenerationTag generationTag) {
        this.kakaoId = kakaoId;
        this.nickname = nickname;
        this.generationTag = generationTag;
        this.localPassBalance = 0;
    }

    public void changeNickname(String nickname) {
        this.nickname = nickname;
    }

    public void changeGenerationTag(GenerationTag generationTag) {
        this.generationTag = generationTag;
    }

    /** LocalPassService 를 통해서만 호출한다. */
    public void applyLocalPassDelta(int delta) {
        this.localPassBalance += delta;
    }

    public boolean canAfford(int amount) {
        return this.localPassBalance >= amount;
    }
}
