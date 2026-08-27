package com.localpick.backend.domain.comment;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long postId,
        Long authorId,
        String authorNickname,
        String authorProfileImageUrl,
        String content,
        LocalDateTime createdAt
) {

    public static CommentResponse from(Comment comment) {
        return new CommentResponse(
                comment.getId(),
                comment.getPost().getId(),
                comment.getAuthor().getId(),
                comment.getAuthor().getNickname(),
                comment.getAuthor().getProfileImageUrl(),
                comment.getContent(),
                comment.getCreatedAt()
        );
    }
}
