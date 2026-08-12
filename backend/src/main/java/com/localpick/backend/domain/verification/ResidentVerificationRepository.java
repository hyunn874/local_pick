package com.localpick.backend.domain.verification;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResidentVerificationRepository
        extends JpaRepository<ResidentVerification, Long> {

    Optional<ResidentVerification> findByUserIdAndRegionId(Long userId, Long regionId);

    List<ResidentVerification> findAllByUserIdAndVerifiedTrue(Long userId);
}
