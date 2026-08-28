package com.localpick.backend.domain.post;

public record AdoptionResponse(
        Long postId,
        int adoptionCount,
        boolean adopted,
        boolean justAdopted
) {}
