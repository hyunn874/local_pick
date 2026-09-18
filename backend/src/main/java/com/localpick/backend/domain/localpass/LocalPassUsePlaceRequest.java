package com.localpick.backend.domain.localpass;

import jakarta.validation.constraints.NotNull;

public record LocalPassUsePlaceRequest(
        @NotNull Long placeId
) {}
