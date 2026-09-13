package com.localpick.backend.domain.verification;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import com.localpick.backend.domain.region.RegionResponse;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.infra.external.naver.NaverRegion;
import com.localpick.backend.infra.external.naver.NaverReverseGeocodingClient;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerificationService {

    private static final int REQUIRED_VERIFY_COUNT = 2;

    private final ResidentVerificationRepository verificationRepository;
    private final RegionRepository regionRepository;
    private final UserRepository userRepository;
    private final NaverReverseGeocodingClient naverReverseGeocodingClient;

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
                REQUIRED_VERIFY_COUNT,
                verification.isVerified(),
                verification.hasResidentAccess(now),
                verification.nextVerifyDate(),
                verification.badgeStatus(now),
                RegionResponse.from(region)
        );
    }

    /**
     * 현재 위치 좌표를 네이버 Reverse Geocoding 으로 행정구역으로 변환한 뒤 인증한다.
     * 좌표는 저장하지 않고 변환 및 체크인 처리에만 사용한다.
     */
    @Transactional
    public ResidentVerifyResponse checkInByLocation(Long userId, ResidentLocationVerifyRequest request) {
        NaverRegion currentRegion = naverReverseGeocodingClient.reverseGeocode(
                request.latitude(), request.longitude());

        if (!sameRegion(currentRegion, request.sidoName(), request.sigunguName())) {
            log.info("[Verification] GPS 지역 불일치 — userId={}, selected={} {}, gps={} {}",
                    userId,
                    request.sidoName(),
                    request.sigunguName(),
                    currentRegion.sidoName(),
                    currentRegion.sigunguName());
            throw new BusinessException(ErrorCode.RESIDENT_REGION_MISMATCH);
        }

        ResidentVerification existingVerification = verificationRepository.findByUserId(userId)
                .orElse(null);
        if (existingVerification != null && !existingVerification.hasGpsVerification()) {
            verificationRepository.deleteByUserId(userId);
            verificationRepository.flush();
            log.info("[Verification] GPS 미검증 기존 기록 초기화 — userId={}", userId);
        }

        ResidentVerifyResponse response = checkIn(userId, new ResidentVerifyRequest(request.sidoName(), request.sigunguName()));
        verificationRepository.findByUserId(userId)
                .ifPresent(ResidentVerification::markGpsVerified);
        return new ResidentVerifyResponse(
                response.verifyCount(),
                response.requiredCount(),
                response.isVerified(),
                true,
                response.nextVerifyDate(),
                response.badgeStatus(),
                response.region()
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
            return new ResidentStatusResponse(false, false, 0, REQUIRED_VERIFY_COUNT, null, null, "inactive", null);
        }

        LocalDateTime now = LocalDateTime.now();
        if (!verification.hasGpsVerification()) {
            return new ResidentStatusResponse(false, false, 0, REQUIRED_VERIFY_COUNT, null, null, "inactive", null);
        }

        return new ResidentStatusResponse(
                verification.isVerified(),
                verification.hasResidentAccess(now),
                verification.getVerifyCount(),
                REQUIRED_VERIFY_COUNT,
                verification.getLastVerifiedAt() != null
                        ? verification.getLastVerifiedAt().toLocalDate() : null,
                verification.nextVerifyDate(),
                verification.badgeStatus(now),
                RegionResponse.from(verification.getRegion())
        );
    }

    private boolean sameRegion(NaverRegion currentRegion, String selectedSidoName, String selectedSigunguName) {
        return normalizeRegionName(currentRegion.sidoName()).equals(normalizeRegionName(selectedSidoName))
                && normalizeRegionName(currentRegion.sigunguName()).equals(normalizeRegionName(selectedSigunguName));
    }

    private String normalizeRegionName(String value) {
        return value == null ? "" : value.replaceAll("\\s+", "").trim();
    }
}
