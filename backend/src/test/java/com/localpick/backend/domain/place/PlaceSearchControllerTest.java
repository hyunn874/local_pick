package com.localpick.backend.domain.place;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import com.localpick.backend.global.exception.GlobalExceptionHandler;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PlaceSearchControllerTest {

    private final PlaceSearchService service = Mockito.mock(PlaceSearchService.class);
    private final MockMvc mockMvc = MockMvcBuilders
            .standaloneSetup(new PlaceSearchController(service))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void searchRouteReturnsPlaceResults() throws Exception {
        when(service.search("불광천", "은평구")).thenReturn(List.of(new PlaceSearchResponse(
                "불광천", "서울특별시 은평구", "", 37.6, 126.9)));

        mockMvc.perform(get("/api/places/search").param("keyword", "불광천").param("region", "은평구"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].placeName").value("불광천"))
                .andExpect(jsonPath("$.data[0].latitude").value(37.6));
    }

    @Test
    void blankKeywordReturnsInvalidInput() throws Exception {
        when(service.search("", null)).thenThrow(new BusinessException(ErrorCode.INVALID_INPUT));

        mockMvc.perform(get("/api/places/search").param("keyword", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("C001"));
    }
}
