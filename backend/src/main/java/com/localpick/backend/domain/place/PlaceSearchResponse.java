package com.localpick.backend.domain.place;

public record PlaceSearchResponse(
        String placeName,
        String address,
        String roadAddress,
        double latitude,
        double longitude
) {
}
