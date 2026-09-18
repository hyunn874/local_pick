package com.localpick.backend.domain.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.infra.external.naver.NaverLocalSearchClient;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

@Service
@RequiredArgsConstructor
public class PlaceSearchService {

    private final NaverLocalSearchClient localSearchClient;

    public List<PlaceSearchResponse> search(String keyword) {
        return search(keyword, null);
    }

    public List<PlaceSearchResponse> search(String keyword, String region) {
        if (keyword == null || keyword.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        String query = keyword.trim();
        if (region != null && !region.isBlank() && !query.contains(region.trim())) {
            query = region.trim() + " " + query;
        }

        JsonNode payload = localSearchClient.search(query);
        JsonNode items = payload.path("items");
        List<PlaceSearchResponse> results = new ArrayList<>();

        for (JsonNode item : items) {
            try {
                double latitude = coordinate(item.path("mapy"), 90);
                double longitude = coordinate(item.path("mapx"), 180);
                String placeName = HtmlUtils.htmlUnescape(
                        item.path("title").asText("").replaceAll("<[^>]+>", "")
                ).trim();
                String address = item.path("address").asText("").trim();
                String roadAddress = item.path("roadAddress").asText("").trim();

                if (placeName.isBlank() || (address.isBlank() && roadAddress.isBlank())) {
                    continue;
                }
                results.add(new PlaceSearchResponse(placeName, address, roadAddress, latitude, longitude));
            } catch (NumberFormatException e) {
                // 좌표가 없는 업체는 지도에 표시할 수 없으므로 검색 결과에서 제외한다.
            }
        }
        return results;
    }

    private double coordinate(JsonNode value, double limit) {
        double coordinate = Double.parseDouble(value.asText());
        if (Math.abs(coordinate) > limit) {
            coordinate /= 10_000_000d;
        }
        if (!Double.isFinite(coordinate) || Math.abs(coordinate) > limit) {
            throw new NumberFormatException("Invalid location coordinate");
        }
        return coordinate;
    }
}
