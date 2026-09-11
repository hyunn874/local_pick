package com.localpick.backend.domain.post;

import com.localpick.backend.domain.comment.CommentRepository;
import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import com.localpick.backend.domain.verification.ResidentVerification;
import com.localpick.backend.domain.verification.ResidentVerificationRepository;
import com.localpick.backend.domain.localpass.LocalPassHistory;
import com.localpick.backend.domain.localpass.LocalPassHistoryRepository;
import com.localpick.backend.domain.localpass.LocalPassReason;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import java.time.LocalDateTime;
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
    private final AdoptionVoteRepository adoptionVoteRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;
    private final RegionRepository regionRepository;
    private final ResidentVerificationRepository verificationRepository;
    private final LocalPassHistoryRepository localPassHistoryRepository;

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
                .map(this::toResponse)
                .toList();
    }

    /** 게시글 상세 조회 */
    @Transactional
    public PostResponse findById(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        post.increaseViewCount();
        return toResponse(post);
    }

    /** 게시글 작성 */
    @Transactional
    public PostResponse create(Long userId, PostCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Region region = regionRepository.findByRegionCode(request.regionCode())
                .orElseThrow(() -> new BusinessException(ErrorCode.REGION_NOT_FOUND));

        if (!hasResidentAccess(userId, region)) {
            throw new BusinessException(ErrorCode.NOT_RESIDENT);
        }

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
                .writtenByResident(true)
                .build();

        postRepository.save(post);
        return toResponse(post);
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
            evaluateRewards(post);
            return new LikeResponse(postId, false, post.getLikeCount());
        } else {
            postLikeRepository.save(PostLike.builder()
                    .post(post)
                    .user(user)
                    .build());
            post.increaseLikeCount();
            evaluateRewards(post);
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

    /** 인증된 내 지역의 채택 명소만 조회한다. */
    @Transactional(readOnly = true)
    public List<AdoptedPlaceResponse> findMyAdoptedPlaces(Long userId, String requestedRegionCode) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        ResidentVerification verification = verificationRepository.findByUserId(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_RESIDENT));
        Region region = verification.getRegion();

        if (!hasResidentAccess(verification)) {
            throw new BusinessException(ErrorCode.NOT_RESIDENT);
        }
        if (requestedRegionCode != null && !requestedRegionCode.isBlank()
                && !region.getRegionCode().equals(requestedRegionCode)) {
            throw new BusinessException(ErrorCode.NOT_RESIDENT);
        }

        return postRepository.findAllByRegionIdAndAdoptedTrue(region.getId())
                .stream()
                .map(AdoptedPlaceResponse::from)
                .toList();
    }

    /** 채택 투표 — 거주자 인증된 사용자만, 한 게시글에 1회만 */
    @Transactional
    public AdoptionResponse vote(Long userId, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 거주자 인증 확인
        if (!hasResidentAccess(userId, post.getRegion())) {
            throw new BusinessException(ErrorCode.NOT_RESIDENT);
        }

        // 중복 투표 확인
        if (adoptionVoteRepository.existsByPostIdAndUserId(postId, userId)) {
            throw new BusinessException(ErrorCode.ALREADY_ADOPTED);
        }

        adoptionVoteRepository.save(AdoptionVote.builder()
                .post(post).user(user).build());

        post.increaseAdoption();
        boolean justAdopted = evaluateRewards(post);

        return new AdoptionResponse(postId, post.getAdoptionCount(), post.isAdopted(), justAdopted);
    }

    /** 공유 완료 기록 — 제안서 기준 채택 조건의 공유 수를 누적한다. */
    @Transactional
    public ShareResponse recordShare(Long userId, Long postId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        post.increaseShareCount();
        boolean justAdopted = evaluateRewards(post);

        return new ShareResponse(postId, post.getShareCount(), post.isAdopted(), justAdopted);
    }

    /** 게시글 수정 — 본인만 가능 */
    @Transactional
    public PostResponse update(Long userId, Long postId, PostCreateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        if (!post.isAuthor(userId)) {
            throw new BusinessException(ErrorCode.NOT_POST_AUTHOR);
        }

        post.edit(request.title(), request.content(), request.placeName());
        return toResponse(post);
    }

    /** 게시글 삭제 — 본인만 가능 */
    @Transactional
    public void delete(Long userId, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        if (!post.isAuthor(userId)) {
            throw new BusinessException(ErrorCode.NOT_POST_AUTHOR);
        }

        postRepository.delete(post);
    }

    private boolean hasResidentAccess(Long userId, Region region) {
        return verificationRepository.findByUserIdAndRegionId(userId, region.getId())
                .map(this::hasResidentAccess)
                .orElse(false);
    }

    private boolean hasResidentAccess(ResidentVerification verification) {
        return verification.getVerifyCount() > 0
                && verification.getLastVerifiedAt() != null
                && ResidentVerification.BADGE_EXPIRY_DAYS >= java.time.Duration.between(
                        verification.getLastVerifiedAt(), LocalDateTime.now()).toDays();
    }

    @Transactional
    public void evaluateRewardsForPost(Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        evaluateRewards(post);
    }

    private boolean evaluateRewards(Post post) {
        long commentCount = commentRepository.countByPostId(post.getId());
        grantActivityRewardIfEligible(post, commentCount);
        return adoptIfEligible(post, commentCount);
    }

    private void grantActivityRewardIfEligible(Post post, long commentCount) {
        if (!post.qualifiesForActivityReward(commentCount)) {
            return;
        }
        if (localPassHistoryRepository.existsByUserIdAndReasonAndReferenceId(
                post.getAuthor().getId(), LocalPassReason.ACTIVITY_THRESHOLD, post.getId())) {
            post.markActivityRewarded();
            return;
        }

        grantLocalPass(post.getAuthor(), LocalPassReason.ACTIVITY_THRESHOLD, post.getId());
        post.markActivityRewarded();
    }

    private boolean adoptIfEligible(Post post, long commentCount) {
        boolean justAdopted = post.adoptIfEngagementThresholdMet(commentCount, LocalDateTime.now());
        if (justAdopted && !localPassHistoryRepository.existsByUserIdAndReasonAndReferenceId(
                post.getAuthor().getId(), LocalPassReason.POST_ADOPTED, post.getId())) {
            grantLocalPass(post.getAuthor(), LocalPassReason.POST_ADOPTED, post.getId());
        }
        return justAdopted;
    }

    private void grantLocalPass(User user, LocalPassReason reason, Long referenceId) {
        int amount = reason.getAmount();
        if (amount == 0) {
            return;
        }
        user.applyLocalPassDelta(amount);
        localPassHistoryRepository.save(LocalPassHistory.builder()
                .user(user)
                .amount(amount)
                .reason(reason)
                .referenceId(referenceId)
                .balanceAfter(user.getLocalPassBalance())
                .build());
    }

    private PostResponse toResponse(Post post) {
        return PostResponse.from(post, commentRepository.countByPostId(post.getId()));
    }
}
