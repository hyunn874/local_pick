package com.localpick.backend.domain.localpass;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceViewRepository extends JpaRepository<PlaceView, Long> {

    boolean existsByUserIdAndPlaceId(Long userId, Long placeId);

    Optional<PlaceView> findByUserIdAndPlaceId(Long userId, Long placeId);

    List<PlaceView> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
