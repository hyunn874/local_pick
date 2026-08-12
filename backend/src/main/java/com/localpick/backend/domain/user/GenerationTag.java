package com.localpick.backend.domain.user;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GenerationTag {

    TWENTIES("20대"),
    THIRTIES_FORTIES("30·40대"),
    FIFTIES_PLUS("50대 이상");

    private final String label;
}
