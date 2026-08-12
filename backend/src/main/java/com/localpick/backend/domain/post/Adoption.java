package com.localpick.backend.domain.post;

import com.localpick.backend.domain.user.User;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 게시글 추천(채택 투표) 이력. 한 사용자는 한 게시글에 1회만 참여할 수 있다. */
@Entity
@Getter
@Table(
        name = "adoptions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_adoption_post_user",
                columnNames = {"post_id", "user_id"})
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Adoption extends BaseTimeEntity {

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
    private Adoption(Post post, User user) {
        this.post = post;
        this.user = user;
    }
}
