package com.localpick.backend.domain.post;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.user.GenerationTag;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 소통방 게시글 = 거주자가 제보한 숨은 명소.
 *
 * latitude/longitude 는 "사용자의 현재 위치"가 아니라 "제보된 장소의 위치"다.
 * 사용자가 지도에서 직접 지정해 등록하는 값이므로 개인위치정보 수집에 해당하지 않는다.
 */
@Entity
@Getter
@Table(
        name = "posts",
        indexes = {
                @Index(name = "idx_post_region", columnList = "region_id"),
                @Index(name = "idx_post_region_adopted", columnList = "region_id, adopted")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Post extends BaseTimeEntity {

    public static final int ACTIVITY_LIKE_THRESHOLD = 10;
    public static final int ACTIVITY_COMMENT_THRESHOLD = 3;
    public static final int ACTIVITY_SHARE_THRESHOLD = 2;
    public static final int ADOPTION_LIKE_THRESHOLD = 30;
    public static final int ADOPTION_COMMENT_THRESHOLD = 10;
    public static final int ADOPTION_SHARE_THRESHOLD = 5;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    /** 장소명 (지도 핀 라벨) */
    @Column(length = 100)
    private String placeName;

    private Double latitude;
    private Double longitude;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GenerationTag generationTag;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "post_images", joinColumns = @JoinColumn(name = "post_id"))
    @Column(name = "image_url", length = 500)
    private List<String> imageUrls = new ArrayList<>();

    /** 작성 시점에 작성자가 해당 지역 거주자 인증을 보유했는지 (배지 표시용) */
    @Column(nullable = false)
    private boolean writtenByResident;

    @Column(nullable = false)
    private int adoptionCount;

    @Column(nullable = false)
    private boolean adopted;

    private LocalDateTime adoptedAt;

    @Column(nullable = false)
    private int viewCount;

    @Column(nullable = false)
    private int likeCount;

    @Column(nullable = false, columnDefinition = "integer default 0")
    private int shareCount;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean activityRewarded;

    @Builder
    private Post(User author, Region region, String title, String content, String placeName,
                 Double latitude, Double longitude, GenerationTag generationTag,
                 List<String> imageUrls, boolean writtenByResident) {
        this.author = author;
        this.region = region;
        this.title = title;
        this.content = content;
        this.placeName = placeName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.generationTag = generationTag;
        this.imageUrls = imageUrls != null ? new ArrayList<>(imageUrls) : new ArrayList<>();
        this.writtenByResident = writtenByResident;
        this.adoptionCount = 0;
        this.adopted = false;
        this.viewCount = 0;
        this.likeCount = 0;
        this.shareCount = 0;
        this.activityRewarded = false;
    }

    /**
     * 레거시 채택 투표 1건을 반영한다. 공식 채택 여부는 좋아요·댓글·공유
     * 세 조건을 모두 충족했는지로 별도 판정한다.
     *
     * @return 증가 후 누적 채택 투표 수
     */
    public int increaseAdoption() {
        this.adoptionCount++;
        return adoptionCount;
    }

    public boolean adoptIfEngagementThresholdMet(long commentCount, LocalDateTime now) {
        if (!adopted
                && likeCount >= ADOPTION_LIKE_THRESHOLD
                && commentCount >= ADOPTION_COMMENT_THRESHOLD
                && shareCount >= ADOPTION_SHARE_THRESHOLD) {
            this.adopted = true;
            this.adoptedAt = now;
            return true;
        }
        return false;
    }

    public void increaseViewCount() {
        this.viewCount++;
    }

    public void increaseLikeCount() {
        this.likeCount++;
    }

    public void decreaseLikeCount() {
        if (this.likeCount > 0) {
            this.likeCount--;
        }
    }

    public void increaseShareCount() {
        this.shareCount++;
    }

    public boolean qualifiesForActivityReward(long commentCount) {
        return !activityRewarded
                && likeCount >= ACTIVITY_LIKE_THRESHOLD
                && commentCount >= ACTIVITY_COMMENT_THRESHOLD
                && shareCount >= ACTIVITY_SHARE_THRESHOLD;
    }

    public void markActivityRewarded() {
        this.activityRewarded = true;
    }

    public void edit(String title, String content, String placeName) {
        this.title = title;
        this.content = content;
        this.placeName = placeName;
    }

    public boolean isAuthor(Long userId) {
        return this.author.getId().equals(userId);
    }
}
