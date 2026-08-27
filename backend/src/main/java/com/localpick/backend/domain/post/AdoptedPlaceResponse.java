package com.localpick.backend.domain.post;

import java.time.LocalDateTime;
import java.util.List;

public record AdoptedPlaceResponse(
        Long postId,
        String placeName,
        String title,
        Double latitude,
        Double longitude,
        int adoptionCount,
        LocalDateTime adoptedAt,
        List<String> imageUrls
) {

    public static AdoptedPlaceResponse from(Post post) {
        return new AdoptedPlaceResponse(
                post.getId(),
                post.getPlaceName(),
                post.getTitle(),
                post.getLatitude(),
                post.getLongitude(),
                post.getAdoptionCount(),
                post.getAdoptedAt(),
                post.getImageUrls()
        );
    }
}
