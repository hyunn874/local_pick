package com.localpick.backend.domain.place;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.infra.external.naver.NaverGeocodingClient;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class PlaceSearchServiceTest {

    private final NaverGeocodingClient client = Mockito.mock(NaverGeocodingClient.class);
    private final PlaceSearchService service = new PlaceSearchService(client);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void mapsBuildingNameAddressesAndCoordinates() throws Exception {
        when(client.search("주스공장")).thenReturn(objectMapper.readTree("""
                {
                  "addresses": [{
                    "jibunAddress": "서울특별시 은평구 응암동 1길 1",
                    "roadAddress": "서울특별시 은평구 응암로 1",
                    "x": "126.456",
                    "y": "37.123",
                    "addressElements": [{"types": ["BUILDING_NAME"], "longName": "주스공장"}]
                  }]
                }
                """));

        assertEquals(List.of(new PlaceSearchResponse(
                "주스공장", "서울특별시 은평구 응암동 1길 1", "서울특별시 은평구 응암로 1",
                37.123, 126.456)), service.search(" 주스공장 "));
    }

    @Test
    void fallsBackToKeywordWhenBuildingNameIsMissing() throws Exception {
        when(client.search("응암로 1")).thenReturn(objectMapper.readTree("""
                {"addresses": [{"jibunAddress": "응암동 1", "roadAddress": "응암로 1",
                "x": "126.456", "y": "37.123",
                "addressElements": [{"types": ["ROAD_NAME"], "longName": "응암로"}]}]}
                """));

        assertEquals("응암로 1", service.search("응암로 1").getFirst().placeName());
    }

    @Test
    void rejectsBlankKeywordWithoutCallingNaver() {
        BusinessException error = assertThrows(BusinessException.class, () -> service.search("  "));

        assertEquals(ErrorCode.INVALID_INPUT, error.getErrorCode());
        verifyNoInteractions(client);
    }
}
