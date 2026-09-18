package com.localpick.backend.domain.localpass;

import com.localpick.backend.domain.post.Post;
import com.localpick.backend.domain.post.PostRepository;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import com.localpick.backend.domain.verification.ResidentVerificationRepository;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LocalPassService {

    private final LocalPassHistoryRepository historyRepository;
    private final PlaceViewRepository placeViewRepository;
    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final ResidentVerificationRepository verificationRepository;

    /** 잔액 조회 */
    @Transactional(readOnly = true)
    public LocalPassBalanceResponse getBalance(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return new LocalPassBalanceResponse(user.getLocalPassBalance());
    }

    /** 적립·사용 이력 조회 */
    @Transactional(readOnly = true)
    public List<LocalPassHistoryResponse> getHistory(Long userId, int page, int size) {
        return historyRepository
                .findAllByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(page, size))
                .getContent()
                .stream()
                .map(LocalPassHistoryResponse::from)
                .toList();
    }

    /** 로컬패스 사용 (차감) */
    @Transactional
    public LocalPassHistoryResponse use(Long userId, LocalPassUseRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (request.amount() == null || request.reason() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        if (!user.canAfford(request.amount())) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_LOCALPASS);
        }

        int delta = -request.amount();
        user.applyLocalPassDelta(delta);

        LocalPassHistory history = LocalPassHistory.builder()
                .user(user)
                .amount(delta)
                .reason(request.reason())
                .balanceAfter(user.getLocalPassBalance())
                .build();

        historyRepository.save(history);
        return LocalPassHistoryResponse.from(history);
    }

    /** 명소 상세 열람. 내 지역/이미 열람한 명소는 차감하지 않는다. */
    @Transactional
    public LocalPassUsePlaceResponse useForPlace(Long userId, Long placeId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Post place = postRepository.findById(placeId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        if (!place.isAdopted()) {
            throw new BusinessException(ErrorCode.POST_NOT_FOUND);
        }

        if (placeViewRepository.existsByUserIdAndPlaceId(userId, placeId)) {
            return new LocalPassUsePlaceResponse(placeId, true, false, user.getLocalPassBalance());
        }

        boolean ownRegion = verificationRepository.findByUserId(userId)
                .filter(verification -> verification.hasResidentAccess(LocalDateTime.now()))
                .map(verification -> verification.getRegion().getId().equals(place.getRegion().getId()))
                .orElse(false);

        boolean charged = false;
        if (!ownRegion) {
            if (!user.canAfford(1)) {
                throw new BusinessException(ErrorCode.INSUFFICIENT_LOCALPASS);
            }
            user.applyLocalPassDelta(-1);
            charged = true;
            historyRepository.save(LocalPassHistory.builder()
                    .user(user)
                    .amount(-1)
                    .reason(LocalPassReason.PLACE_VIEWED)
                    .referenceId(placeId)
                    .balanceAfter(user.getLocalPassBalance())
                    .build());
        }

        placeViewRepository.save(PlaceView.builder()
                .user(user)
                .place(place)
                .build());

        return new LocalPassUsePlaceResponse(placeId, true, charged, user.getLocalPassBalance());
    }

    @Transactional(readOnly = true)
    public PlaceViewedResponse isViewed(Long userId, Long placeId) {
        return new PlaceViewedResponse(placeViewRepository.existsByUserIdAndPlaceId(userId, placeId));
    }

    @Transactional(readOnly = true)
    public List<ViewedPlaceResponse> getViewedPlaces(Long userId) {
        return placeViewRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(ViewedPlaceResponse::from)
                .toList();
    }
}
