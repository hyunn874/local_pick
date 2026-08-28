package com.localpick.backend.domain.localpass;

import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import com.localpick.backend.global.exception.BusinessException;
import com.localpick.backend.global.exception.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LocalPassService {

    private final LocalPassHistoryRepository historyRepository;
    private final UserRepository userRepository;

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
}
