package com.localpick.backend.domain.region;

import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RegionService {

    private final RegionRepository regionRepository;

    /** 지역 선택 화면용 — 전체 목록 (시도 필터 가능) */
    public List<RegionResponse> findAll(String sidoName) {
        List<Region> regions = (sidoName == null || sidoName.isBlank())
                ? regionRepository.findAll()
                : regionRepository.findAllBySidoName(sidoName);

        return regions.stream()
                .map(RegionResponse::from)
                .toList();
    }

    public RegionResponse findByCode(String regionCode) {
        Region region = regionRepository.findByRegionCode(regionCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.REGION_NOT_FOUND));
        return RegionResponse.from(region);
    }

    /**
     * 행정구역 텍스트로 지역을 찾는다.
     * 위치 기반 인증에서는 서버가 네이버 Reverse Geocoding 으로 변환한 값을 사용한다.
     */
    public RegionResponse findByName(String sidoName, String sigunguName) {
        Region region = regionRepository.findBySidoNameAndSigunguName(sidoName, sigunguName)
                .orElseThrow(() -> new BusinessException(ErrorCode.REGION_NOT_FOUND));
        return RegionResponse.from(region);
    }
}
