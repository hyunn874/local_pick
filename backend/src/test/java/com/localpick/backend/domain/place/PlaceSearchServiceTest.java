package com.localpick.backend.domain.place;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.infra.external.naver.NaverLocalSearchClient;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class PlaceSearchServiceTest {

    private final NaverLocalSearchClient client = Mockito.mock(NaverLocalSearchClient.class);
    private final PlaceSearchService service = new PlaceSearchService(client);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void mapsLocalSearchResultAndCoordinates() throws Exception {
        when(client.search("은평구 주스공장")).thenReturn(objectMapper.readTree("""
                {
                  "items": [{
                    "title": "<b>주스</b>&amp;공장",
                    "address": "서울특별시 은평구 응암동 1길 1",
                    "roadAddress": "서울특별시 은평구 응암로 1",
                    "mapx": "1264560000",
                    "mapy": "371230000"
                  }]
                }
                """));

        assertEquals(List.of(new PlaceSearchResponse(
                "주스&공장", "서울특별시 은평구 응암동 1길 1", "서울특별시 은평구 응암로 1",
                37.123, 126.456)), service.search(" 주스공장 ", "은평구"));
    }

    @Test
    void acceptsDecimalCoordinatesAndSkipsUnlocatedItems() throws Exception {
        when(client.search("오산 맛집")).thenReturn(objectMapper.readTree("""
                {"items": [
                  {"title": "맛집", "address": "오산시", "mapx": "126.456", "mapy": "37.123"},
                  {"title": "좌표없음", "address": "오산시", "mapx": "", "mapy": ""}
                ]}
                """));

        assertEquals(1, service.search("맛집", "오산").size());
        assertEquals("맛집", service.search("맛집", "오산").getFirst().placeName());
    }

    @Test
    void rejectsBlankKeywordWithoutCallingNaver() {
        BusinessException error = assertThrows(BusinessException.class, () -> service.search("  "));

        assertEquals(ErrorCode.INVALID_INPUT, error.getErrorCode());
        verifyNoInteractions(client);
    }
}
