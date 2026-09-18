package com.localpick.backend.domain.localpass;

import com.localpick.backend.domain.post.Post;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(
        name = "place_views",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_place_view_user_place",
                columnNames = {"user_id", "place_id"}
        ),
        indexes = {
                @Index(name = "idx_place_views_user", columnList = "user_id, createdAt"),
                @Index(name = "idx_place_views_place", columnList = "place_id")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceView extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private Post place;

    @Builder
    private PlaceView(User user, Post place) {
        this.user = user;
        this.place = place;
    }
}
