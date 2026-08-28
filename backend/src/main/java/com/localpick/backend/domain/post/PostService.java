package com.localpick.backend.domain.post;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import com.localpick.backend.domain.verification.ResidentVerificationRepository;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final UserRepository userRepository;
    private final RegionRepository regionRepository;
    private final ResidentVerificationRepository verificationRepository;

    /** 게시글 목록 조회 */
    @Transactional(readOnly = true)
    public List<PostResponse> findAll(String regionCode, int page, int size) {
        PageRequest pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Post> posts;
        if (regionCode != null && !regionCode.isBlank()) {
            Region region = regionRepository.findByRegionCode(regionCode)
                    .orElseThrow(() -> new BusinessException(ErrorCode.REGION_NOT_FOUND));
            posts = postRepository.findAllByRegionId(region.getId(), pageable);
        } else {
            posts = postRepository.findAll(pageable);
        }

        return posts.getContent().stream()
                .map(PostResponse::from)
                .toList();
    }

    /** 게시글 상세 조회 */
    @Transactional
    public PostResponse findById(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        post.increaseViewCount();
        return PostResponse.from(post);
    }

    /** 게시글 작성 */
    @Transactional
    public PostResponse create(Long userId, PostCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Region region = regionRepository.findByRegionCode(request.regionCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.REGION_NOT_FOUND));

        boolean isResident = verificationRepository.findByUserIdAndRegionId(userId, region.getId())
                .map(v -> v.isVerified())
                .orElse(false);

        Post post = Post.builder()
                .author(user)
                .region(region)
                .title(request.title())
                .content(request.content())
                .placeName(request.placeName())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .generationTag(user.getGenerationTag())
                .imageUrls(request.imageUrls())
                .writtenByResident(isResident)
                .build();

        postRepository.save(post);
        return PostResponse.from(post);
    }

    /** 좋아요 토글 — 이미 눌렀으면 취소, 아니면 추가 */
    @Transactional
    public LikeResponse toggleLike(Long userId, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        var existing = postLikeRepository.findByPostIdAndUserId(postId, userId);

        if (existing.isPresent()) {
            postLikeRepository.delete(existing.get());
            post.decreaseLikeCount();
            return new LikeResponse(postId, false, post.getLikeCount());
        } else {
            postLikeRepository.save(PostLike.builder()
                    .post(post)
                    .user(user)
                    .build());
            post.increaseLikeCount();
            return new LikeResponse(postId, true, post.getLikeCount());
        }
    }

    /** 채택된 명소 목록. imageUrls 가 LAZY 이므로 트랜잭션 안에서 DTO 변환한다. */
    @Transactional(readOnly = true)
    public List<AdoptedPlaceResponse> findAdoptedPlaces(String regionCode) {
        Region region = regionRepository.findByRegionCode(regionCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.REGION_NOT_FOUND));

        return postRepository.findAllByRegionIdAndAdoptedTrue(region.getId())
                .stream()
                .map(AdoptedPlaceResponse::from)
                .toList();
    }
}
