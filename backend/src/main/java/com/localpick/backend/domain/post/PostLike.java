package com.localpick.backend.domain.post;

import com.localpick.backend.domain.user.User;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 게시글 좋아요. 한 사용자는 한 게시글에 1회만 좋아요할 수 있다. */
@Entity
@Getter
@Table(
        name = "post_likes",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_like_post_user",
                columnNames = {"post_id", "user_id"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostLike extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Builder
    private PostLike(Post post, User user) {
        this.post = post;
        this.user = user;
    }
}
