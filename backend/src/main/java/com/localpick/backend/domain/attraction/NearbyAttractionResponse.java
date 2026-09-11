package com.localpick.backend.domain.attraction;

import com.localpick.backend.infra.external.kto.NearbyAttractionItem;

public record NearbyAttractionResponse(
        String contentId,
        String title,
        String address,
        double longitude,
        double latitude,
        double distanceMeters,
        String imageUrl,
        String thumbnailUrl,
        String category,
        String tel
) {

    public static NearbyAttractionResponse from(NearbyAttractionItem item) {
        return new NearbyAttractionResponse(
                item.contentId(),
                item.title(),
                item.address().trim(),
                item.longitude(),
                item.latitude(),
                item.distance(),
                item.imageUrl(),
                item.thumbnailUrl(),
                item.categoryLabel(),
                item.tel()
        );
    }
}
