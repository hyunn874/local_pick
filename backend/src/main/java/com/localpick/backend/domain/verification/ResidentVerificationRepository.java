package com.localpick.backend.domain.verification;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResidentVerificationRepository
        extends JpaRepository<ResidentVerification, Long> {

    Optional<ResidentVerification> findByUserId(Long userId);

    Optional<ResidentVerification> findByUserIdAndRegionId(Long userId, Long regionId);

    void deleteByUserId(Long userId);
}
