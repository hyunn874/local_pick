package com.localpick.backend.domain.localpass;

public record LocalPassUsePlaceResponse(
        Long placeId,
        boolean viewed,
        boolean charged,
        int balance
) {}
