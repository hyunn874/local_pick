package com.localpick.backend.domain.user;

import com.localpick.backend.domain.localpass.LocalPassHistory;
import com.localpick.backend.domain.localpass.LocalPassHistoryRepository;
import com.localpick.backend.domain.localpass.LocalPassReason;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final LocalPassHistoryRepository localPassHistoryRepository;

    @Transactional(readOnly = true)
    public UserResponse findMe(Long userId) {
        return UserResponse.from(getUser(userId));
    }

    /**
     * 온보딩 완료 — 닉네임과 세대 태그를 확정하고 가입 보너스를 지급한다.
     *
     * 보너스를 가입 시점이 아니라 여기서 주는 이유:
     * 온보딩을 마치지 않은 계정에 잔액이 쌓이는 것을 막기 위해서다.
     */
    @Transactional
    public UserResponse completeOnboarding(Long userId, OnboardingRequest request) {
        User user = getUser(userId);

        if (user.isOnboarded()) {
            throw new BusinessException(ErrorCode.ALREADY_ONBOARDED);
        }
        if (userRepository.existsByNickname(request.nickname())) {
            throw new BusinessException(ErrorCode.NICKNAME_DUPLICATED);
        }

        user.completeOnboarding(request.nickname(), request.generationTag());
        grantSignupBonus(user);

        log.info("[User] 온보딩 완료 — userId={}, generation={}",
                userId, request.generationTag());
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse changeNickname(Long userId, String nickname) {
        User user = getUser(userId);

        if (nickname.equals(user.getNickname())) {
            return UserResponse.from(user);
        }
        if (userRepository.existsByNickname(nickname)) {
            throw new BusinessException(ErrorCode.NICKNAME_DUPLICATED);
        }

        user.changeNickname(nickname);
        return UserResponse.from(user);
    }

    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String nickname) {
        return !userRepository.existsByNickname(nickname);
    }

    /**
     * 로컬패스 잔액과 이력을 같은 트랜잭션에서 함께 기록한다.
     * User.localPassBalance 는 조회용 캐시이고 정산 근거는 이력이다.
     */
    private void grantSignupBonus(User user) {
        LocalPassReason reason = LocalPassReason.SIGNUP_BONUS;

        boolean alreadyGranted = localPassHistoryRepository
                .existsByUserIdAndReasonAndReferenceId(user.getId(), reason, user.getId());
        if (alreadyGranted) {
            return;
        }

        user.applyLocalPassDelta(reason.getAmount());
        localPassHistoryRepository.save(LocalPassHistory.builder()
                .user(user)
                .amount(reason.getAmount())
                .reason(reason)
                .referenceId(user.getId())
                .balanceAfter(user.getLocalPassBalance())
                .build());
    }

    private User getUser(Long userId) {
        if (userId == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
