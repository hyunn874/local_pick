package com.localpick.backend.domain.post;

import java.time.LocalDateTime;
import java.util.List;
import com.localpick.backend.domain.user.GenerationTag;

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
        String authorAgeGroup,
        boolean writtenByResident,
        int likeCount,
        long commentCount,
        int shareCount,
        int adoptionCount,
        int activityLikeThreshold,
        int activityCommentThreshold,
        int activityShareThreshold,
        int adoptionLikeThreshold,
        int adoptionCommentThreshold,
        int adoptionShareThreshold,
        boolean adopted,
        List<String> imageUrls,
        LocalDateTime createdAt
) {

    public static PostResponse from(Post post, long commentCount) {
        GenerationTag generationTag = post.getGenerationTag() != null
                ? post.getGenerationTag()
                : GenerationTag.TWENTIES;
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
                generationTag.name(),
                post.getAuthor().getGenerationTag() != null
                        ? post.getAuthor().getGenerationTag().getLabel()
                        : generationTag.getLabel(),
                post.isWrittenByResident(),
                post.getLikeCount(),
                commentCount,
                post.getShareCount(),
                post.getAdoptionCount(),
                Post.ACTIVITY_LIKE_THRESHOLD,
                Post.ACTIVITY_COMMENT_THRESHOLD,
                Post.ACTIVITY_SHARE_THRESHOLD,
                Post.ADOPTION_LIKE_THRESHOLD,
                Post.ADOPTION_COMMENT_THRESHOLD,
                Post.ADOPTION_SHARE_THRESHOLD,
                post.isAdopted(),
                post.getImageUrls() != null ? List.copyOf(post.getImageUrls()) : List.of(),
                post.getCreatedAt()
        );
    }
}
