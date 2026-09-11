package com.localpick.backend.domain.post;

public record ShareResponse(
        Long postId,
        int shareCount,
        boolean adopted,
        boolean justAdopted
) {}
