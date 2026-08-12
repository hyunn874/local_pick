package com.localpick.backend.domain.verification;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 거주자 인증 상태.
 *
 * GPS 좌표는 서버에 저장하지 않는다. 앱에서 카카오 Reverse Geocoding 으로
 * 행정구역 텍스트를 변환한 뒤, 그 지역코드만 서버로 전송해 체크인을 누적한다.
 * 7일 안에 3회 체크인하면 해당 지역 거주자로 인정한다.
 */
@Entity
@Getter
@Table(
        name = "resident_verifications",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_verification_user_region",
                columnNames = {"user_id", "region_id"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ResidentVerification extends BaseTimeEntity {

    public static final int REQUIRED_CHECK_IN_COUNT = 3;
    public static final int WINDOW_DAYS = 7;
    public static final int VALID_DAYS = 90;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    /** 현재 윈도우 안에서 누적된 체크인 횟수 */
    @Column(nullable = false)
    private int checkInCount;

    /** 현재 윈도우가 시작된 시각 */
    private LocalDateTime windowStartedAt;

    private LocalDateTime lastCheckInAt;

    @Column(nullable = false)
    private boolean verified;

    /** 인증 만료 시각. 만료되면 다시 체크인해야 한다. */
    private LocalDateTime verifiedUntil;

    @Builder
    private ResidentVerification(User user, Region region) {
        this.user = user;
        this.region = region;
        this.checkInCount = 0;
        this.verified = false;
    }

    /**
     * 체크인 1회를 반영한다. 하루 1회만 인정된다.
     *
     * @return 이번 체크인으로 인증이 새로 완료되었으면 true
     */
    public boolean checkIn(LocalDateTime now) {
        if (lastCheckInAt != null && lastCheckInAt.toLocalDate().equals(now.toLocalDate())) {
            return false;
        }
        if (windowStartedAt == null || windowStartedAt.plusDays(WINDOW_DAYS).isBefore(now)) {
            this.windowStartedAt = now;
            this.checkInCount = 0;
        }

        this.checkInCount++;
        this.lastCheckInAt = now;

        if (!isValidAt(now) && checkInCount >= REQUIRED_CHECK_IN_COUNT) {
            this.verified = true;
            this.verifiedUntil = now.plusDays(VALID_DAYS);
            return true;
        }
        return false;
    }

    public boolean isValidAt(LocalDateTime now) {
        return verified && verifiedUntil != null && verifiedUntil.isAfter(now);
    }

    public int getRemainingCount() {
        return Math.max(0, REQUIRED_CHECK_IN_COUNT - checkInCount);
    }
}
