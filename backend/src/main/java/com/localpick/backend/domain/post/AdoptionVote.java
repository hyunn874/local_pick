package com.localpick.backend.domain.post;

import com.localpick.backend.domain.user.User;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 채택 투표. 거주자 인증된 사용자만 투표 가능. 한 게시글에 1회만. */
@Entity
@Getter
@Table(
        name = "adoption_votes",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_adoption_post_user",
                columnNames = {"post_id", "user_id"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AdoptionVote extends BaseTimeEntity {

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
    private AdoptionVote(Post post, User user) {
        this.post = post;
        this.user = user;
    }
}
