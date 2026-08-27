package com.localpick.backend.domain.verification;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 거주자 인증 상태. User 당 최대 1건만 존재한다.
 *
 * GPS 좌표는 서버에 저장하지 않는다. 앱에서 카카오 Reverse Geocoding 으로
 * 행정구역 텍스트를 변환한 뒤, 시도·시군구명만 서버로 전송한다.
 *
 * 인증 정책:
 *   1회차 — 최초 인증 (즉시)
 *   2회차 — 1회차로부터 6~8일 후 → verified=true
 *   3회차~ — 매월 재인증 (전회 인증일로부터 27~33일)
 *   재인증 미이행 시 배지 비활성 (lastVerifiedAt + 33일 초과)
 *   다른 지역 인증 시 기존 레코드 삭제 후 새로 생성
 */
@Entity
@Getter
@Table(
        name = "resident_verifications",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_verification_user",
                columnNames = {"user_id"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ResidentVerification extends BaseTimeEntity {

    /** 2회차 허용 범위: 1회차 + 6~8일 */
    public static final int SECOND_MIN_DAYS = 6;
    public static final int SECOND_MAX_DAYS = 8;

    /** 3회차 이후 재인증 허용 범위: 전회 + 27~33일 */
    public static final int RENEW_MIN_DAYS = 27;
    public static final int RENEW_MAX_DAYS = 33;

    /** 배지 만료 기준: 마지막 인증일 + 33일 */
    public static final int BADGE_EXPIRY_DAYS = 33;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    /** 누적 인증 횟수 (1회차, 2회차, 3회차…) */
    @Column(nullable = false)
    private int verifyCount;

    /** 1회차 인증 시각. 2회차 윈도우 계산의 기준점. */
    private LocalDateTime firstVerifiedAt;

    /** 가장 최근 인증 시각. 재인증 윈도우·배지 만료 계산의 기준점. */
    private LocalDateTime lastVerifiedAt;

    /** 2회 이상 인증을 마쳤는지 */
    @Column(nullable = false)
    private boolean verified;

    @Builder
    private ResidentVerification(User user, Region region) {
        this.user = user;
        this.region = region;
        this.verifyCount = 0;
        this.verified = false;
    }

    /**
     * 인증 1회를 시도한다.
     *
     * @return 인증 성공이면 true, 시간 범위 밖이면 false
     */
    public boolean verify(LocalDateTime now) {
        if (verifyCount == 0) {
            // 1회차: 무조건 성공
            this.verifyCount = 1;
            this.firstVerifiedAt = now;
            this.lastVerifiedAt = now;
            return true;
        }

        if (verifyCount == 1) {
            // 2회차: 1회차로부터 6~8일
            long days = daysBetween(firstVerifiedAt, now);
            if (days < SECOND_MIN_DAYS || days > SECOND_MAX_DAYS) {
                return false;
            }
            this.verifyCount = 2;
            this.lastVerifiedAt = now;
            this.verified = true;
            return true;
        }

        // 3회차 이후: 전회 인증일로부터 27~33일
        long days = daysBetween(lastVerifiedAt, now);
        if (days < RENEW_MIN_DAYS || days > RENEW_MAX_DAYS) {
            return false;
        }
        this.verifyCount++;
        this.lastVerifiedAt = now;
        return true;
    }

    /**
     * 배지 상태를 판정한다. DB 에 저장하지 않고 조회 시마다 계산한다.
     *
     * active: verified=true 이고 마지막 인증일로부터 33일 이내
     * inactive: 그 외
     */
    public String badgeStatus(LocalDateTime now) {
        if (verified && lastVerifiedAt != null
                && daysBetween(lastVerifiedAt, now) <= BADGE_EXPIRY_DAYS) {
            return "active";
        }
        return "inactive";
    }

    /**
     * 다음 인증 가능 날짜를 계산한다.
     *
     * verifyCount==0 → null (지금 바로 가능)
     * verifyCount==1 → firstVerifiedAt + 6일
     * verifyCount>=2 → lastVerifiedAt + 27일
     */
    public LocalDate nextVerifyDate() {
        if (verifyCount == 0) {
            return null;
        }
        if (verifyCount == 1) {
            return firstVerifiedAt.toLocalDate().plusDays(SECOND_MIN_DAYS);
        }
        return lastVerifiedAt.toLocalDate().plusDays(RENEW_MIN_DAYS);
    }

    private static long daysBetween(LocalDateTime from, LocalDateTime to) {
        return java.time.Duration.between(from, to).toDays();
    }
}
