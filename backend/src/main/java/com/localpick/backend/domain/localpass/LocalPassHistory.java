package com.localpick.backend.domain.localpass;

import com.localpick.backend.domain.user.User;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 로컬패스 증감 이력.
 *
 * User.localPassBalance 는 조회 편의를 위한 캐시이고, 정산의 근거는 이 테이블이다.
 * 잔액 변경과 이력 기록은 반드시 같은 트랜잭션에서 함께 처리한다.
 */
@Entity
@Getter
@Table(
        name = "localpass_histories",
        indexes = @Index(name = "idx_localpass_user", columnList = "user_id, createdAt")
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LocalPassHistory extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 적립은 양수, 사용은 음수 */
    @Column(nullable = false)
    private int amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private LocalPassReason reason;

    /** 관련 엔티티 ID (게시글 채택이면 postId 등). 중복 적립 방지 및 추적용. */
    private Long referenceId;

    /** 이 거래 직후의 잔액 스냅샷 */
    @Column(nullable = false)
    private int balanceAfter;

    @Builder
    private LocalPassHistory(User user, int amount, LocalPassReason reason,
                             Long referenceId, int balanceAfter) {
        this.user = user;
        this.amount = amount;
        this.reason = reason;
        this.referenceId = referenceId;
        this.balanceAfter = balanceAfter;
    }

    public boolean isEarning() {
        return amount > 0;
    }
}
