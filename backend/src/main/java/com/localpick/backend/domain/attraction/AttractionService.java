package com.localpick.backend.domain.attraction;

import com.localpick.backend.infra.external.kto.KtoTourApiClient;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AttractionService {

    private final KtoTourApiClient tourApiClient;

    /**
     * 좌표 기반 주변 관광지 조회.
     *
     * @param longitude 경도
     * @param latitude  위도
     * @param radius    반경 (미터, 기본 5000)
     * @param limit     최대 조회 건수 (기본 10)
     */
    public List<NearbyAttractionResponse> findNearby(
            double longitude, double latitude, int radius, int limit) {
        return tourApiClient.fetchNearbyAttractions(longitude, latitude, radius, limit)
                .stream()
                .map(NearbyAttractionResponse::from)
                .toList();
    }
}
