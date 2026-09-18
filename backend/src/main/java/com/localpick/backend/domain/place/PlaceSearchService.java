package com.localpick.backend.domain.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.infra.external.naver.NaverGeocodingClient;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PlaceSearchService {

    private final NaverGeocodingClient geocodingClient;

    public List<PlaceSearchResponse> search(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        String query = keyword.trim();
        JsonNode payload = geocodingClient.search(query);
        JsonNode addresses = payload == null ? null : payload.path("addresses");
        if (addresses == null || !addresses.isArray()) {
            throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
        }

        List<PlaceSearchResponse> results = new ArrayList<>();
        for (JsonNode address : addresses) {
            try {
                results.add(new PlaceSearchResponse(
                        placeName(address.path("addressElements"), query),
                        address.path("jibunAddress").asText(""),
                        address.path("roadAddress").asText(""),
                        Double.parseDouble(address.path("y").asText()),
                        Double.parseDouble(address.path("x").asText())
                ));
            } catch (NumberFormatException e) {
                throw new BusinessException(ErrorCode.EXTERNAL_API_ERROR);
            }
        }
        return results;
    }

    private String placeName(JsonNode addressElements, String keyword) {
        if (addressElements.isArray()) {
            for (JsonNode element : addressElements) {
                if (hasBuildingNameType(element.path("types"))
                        || hasBuildingNameType(element.path("type"))) {
                    String name = element.path("longName").asText("");
                    if (name.isBlank()) {
                        name = element.path("shortName").asText("");
                    }
                    if (!name.isBlank()) {
                        return name;
                    }
                }
            }
        }
        return keyword;
    }

    private boolean hasBuildingNameType(JsonNode types) {
        if (types.isArray()) {
            for (JsonNode type : types) {
                if ("BUILDING_NAME".equals(type.asText())) {
                    return true;
                }
            }
        }
        return "BUILDING_NAME".equals(types.asText());
    }
}
