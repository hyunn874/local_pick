package com.localpick.backend.domain.verification;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationService {

    private final ResidentVerificationRepository verificationRepository;
    private final RegionRepository regionRepository;
    private final UserRepository userRepository;

    /**
     * 거주자 인증 체크인.
     *
     * 다른 지역이면 기존 레코드를 삭제하고 새로 생성한다 (1회차).
     * 같은 지역이면 시간 윈도우를 확인해 인증을 진행한다.
     */
    @Transactional
    public ResidentVerifyResponse checkIn(Long userId, ResidentVerifyRequest request) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Region region = regionRepository.findBySidoNameAndSigunguName(
                        request.sidoName(), request.sigunguName())
                .orElseThrow(() -> new BusinessException(ErrorCode.REGION_NOT_FOUND));

        LocalDateTime now = LocalDateTime.now();

        ResidentVerification verification = verificationRepository.findByUserId(userId)
                .orElse(null);

        if (verification != null && !verification.getRegion().getId().equals(region.getId())) {
            // 다른 지역에서 인증 → 기존 초기화 + 새 지역 1회차
            verificationRepository.deleteByUserId(userId);
            verificationRepository.flush();
            verification = null;
            log.info("[Verification] 지역 변경 — userId={}, newRegion={}",
                    userId, region.getFullName());
        }

        if (verification == null) {
            verification = verificationRepository.save(
                    ResidentVerification.builder()
                            .user(user)
                            .region(region)
                            .build());
        }

        boolean success = verification.verify(now);
        if (!success) {
            throw new BusinessException(ErrorCode.VERIFY_NOT_IN_WINDOW);
        }

        log.info("[Verification] 인증 성공 — userId={}, region={}, count={}",
                userId, region.getFullName(), verification.getVerifyCount());

        return new ResidentVerifyResponse(
                verification.getVerifyCount(),
                verification.isVerified(),
                verification.nextVerifyDate(),
                verification.badgeStatus(now)
        );
    }

    /** 현재 인증 상태 조회 */
    @Transactional(readOnly = true)
    public ResidentStatusResponse getStatus(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        ResidentVerification verification = verificationRepository.findByUserId(userId)
                .orElse(null);

        if (verification == null) {
            return new ResidentStatusResponse(false, 0, null, null, "inactive");
        }

        LocalDateTime now = LocalDateTime.now();
        return new ResidentStatusResponse(
                verification.isVerified(),
                verification.getVerifyCount(),
                verification.getLastVerifiedAt() != null
                        ? verification.getLastVerifiedAt().toLocalDate() : null,
                verification.nextVerifyDate(),
                verification.badgeStatus(now)
        );
    }
}
