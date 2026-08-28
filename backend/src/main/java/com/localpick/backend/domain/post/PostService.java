package com.localpick.backend.domain.post;

import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
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

    /** 채택 투표 — 거주자 인증된 사용자만, 한 게시글에 1회만 */
    @Transactional
    public AdoptionResponse vote(Long userId, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 거주자 인증 확인
        boolean isResident = verificationRepository
                .findByUserIdAndRegionId(userId, post.getRegion().getId())
                .map(v -> v.isVerified())
                .orElse(false);
        if (!isResident) {
            throw new BusinessException(ErrorCode.NOT_RESIDENT);
        }

        // 중복 투표 확인
        if (adoptionVoteRepository.existsByPostIdAndUserId(postId, userId)) {
            throw new BusinessException(ErrorCode.ALREADY_ADOPTED);
        }

        adoptionVoteRepository.save(AdoptionVote.builder()
                .post(post).user(user).build());

        boolean justAdopted = post.increaseAdoption(LocalDateTime.now());

        // 채택 확정 시 작성자에게 로컬패스 지급
        if (justAdopted) {
            User author = post.getAuthor();
            int reward = LocalPassReason.POST_ADOPTED.getAmount();
            author.applyLocalPassDelta(reward);
            localPassHistoryRepository.save(LocalPassHistory.builder()
                    .user(author)
                    .amount(reward)
                    .reason(LocalPassReason.POST_ADOPTED)
                    .referenceId(postId)
                    .balanceAfter(author.getLocalPassBalance())
                    .build());
        }

        // 투표자에게 참여 보상
        int participationReward = LocalPassReason.ADOPTION_PARTICIPATED.getAmount();
        user.applyLocalPassDelta(participationReward);
        localPassHistoryRepository.save(LocalPassHistory.builder()
                .user(user)
                .amount(participationReward)
                .reason(LocalPassReason.ADOPTION_PARTICIPATED)
                .referenceId(postId)
                .balanceAfter(user.getLocalPassBalance())
                .build());

        return new AdoptionResponse(postId, post.getAdoptionCount(), post.isAdopted(), justAdopted);
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
        return PostResponse.from(post);
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
}
