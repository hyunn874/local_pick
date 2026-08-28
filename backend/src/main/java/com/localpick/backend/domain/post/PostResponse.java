package com.localpick.backend.domain.post;

import java.time.LocalDateTime;
import java.util.List;

public record PostResponse(
        Long id,
        String title,
        String content,
        String placeName,
        String regionCode,
        String regionName,
        Double latitude,
        Double longitude,
        Long authorId,
        String authorNickname,
        String authorProfileImageUrl,
        String generationTag,
        boolean writtenByResident,
        int likeCount,
        int adoptionCount,
        boolean adopted,
        List<String> imageUrls,
        LocalDateTime createdAt
) {

    public static PostResponse from(Post post) {
        return new PostResponse(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                post.getPlaceName(),
                post.getRegion().getRegionCode(),
                post.getRegion().getFullName(),
                post.getLatitude(),
                post.getLongitude(),
                post.getAuthor().getId(),
                post.getAuthor().getNickname(),
                post.getAuthor().getProfileImageUrl(),
                post.getGenerationTag().name(),
                post.isWrittenByResident(),
                post.getLikeCount(),
                post.getAdoptionCount(),
                post.isAdopted(),
                post.getImageUrls() != null ? List.copyOf(post.getImageUrls()) : List.of(),
                post.getCreatedAt()
        );
    }
}
