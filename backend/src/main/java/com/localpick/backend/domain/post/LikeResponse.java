package com.localpick.backend.domain.post;

public record LikeResponse(
        Long postId,
        boolean liked,
        int likeCount
) {
}
