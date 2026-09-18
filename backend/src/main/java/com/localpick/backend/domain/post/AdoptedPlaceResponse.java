package com.localpick.backend.domain.post;

import java.time.LocalDateTime;
import java.util.List;

public record AdoptedPlaceResponse(
        Long postId,
        String placeName,
        String title,
        String content,
        String category,
        String address,
        String regionCode,
        String regionName,
        Double latitude,
        Double longitude,
        int likeCount,
        long commentCount,
        int shareCount,
        int adoptionCount,
        LocalDateTime adoptedAt,
        String generationTag,
        List<String> imageUrls
) {

    public static AdoptedPlaceResponse from(Post post) {
        return from(post, 0L);
    }

    public static AdoptedPlaceResponse from(Post post, long commentCount) {
        return new AdoptedPlaceResponse(
                post.getId(),
                post.getPlaceName(),
                post.getTitle(),
                post.getContent(),
                extractBracketValue(post.getContent(), "장소유형"),
                extractBracketValue(post.getContent(), "위치/주소"),
                post.getRegion().getRegionCode(),
                post.getRegion().getFullName(),
                post.getLatitude(),
                post.getLongitude(),
                post.getLikeCount(),
                commentCount,
                post.getShareCount(),
                post.getAdoptionCount(),
                post.getAdoptedAt(),
                post.getGenerationTag() != null ? post.getGenerationTag().name() : null,
                post.getImageUrls() != null ? List.copyOf(post.getImageUrls()) : List.of()
        );
    }

    private static String extractBracketValue(String content, String key) {
        if (content == null || content.isBlank()) {
            return null;
        }

        String prefix = "[" + key + "] ";
        for (String line : content.split("\\R")) {
            if (line.startsWith(prefix)) {
                return line.substring(prefix.length()).trim();
            }
        }
        return null;
    }
}
