package com.localpick.backend.domain.localpass;

import jakarta.validation.constraints.Min;

public record LocalPassUseRequest(
        @Min(1) Integer amount,
        LocalPassReason reason,
        Long placeId
) {}
