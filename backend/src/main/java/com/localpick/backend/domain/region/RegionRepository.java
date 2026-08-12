package com.localpick.backend.domain.region;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegionRepository extends JpaRepository<Region, Long> {

    Optional<Region> findByRegionCode(String regionCode);

    Optional<Region> findBySidoNameAndSigunguName(String sidoName, String sigunguName);

    List<Region> findAllBySidoName(String sidoName);
}
