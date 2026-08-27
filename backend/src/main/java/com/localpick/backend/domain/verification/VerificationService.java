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
     * 거주자 체크인.
     *
     * 앱에서 카카오 Reverse Geocoding 으로 변환한 행정구역 텍스트만 받는다.
     * GPS 좌표는 서버로 전송하지 않는다 (위치기반서비스 신고 회피).
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

        ResidentVerification verification = verificationRepository
                .findByUserIdAndRegionId(userId, region.getId())
                .orElseGet(() -> verificationRepository.save(
                        ResidentVerification.builder()
                                .user(user)
                                .region(region)
                                .build()));

        LocalDateTime now = LocalDateTime.now();
        boolean newlyVerified = verification.checkIn(now);

        if (newlyVerified) {
            log.info("[Verification] 거주자 인증 완료 — userId={}, region={}",
                    userId, region.getFullName());
        }

        return ResidentVerifyResponse.from(verification, region, now);
    }
}
