package com.localpick.backend.domain.localpass;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocalPassHistoryRepository extends JpaRepository<LocalPassHistory, Long> {

    Page<LocalPassHistory> findAllByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /** 같은 사유·같은 대상으로 중복 적립되는 것을 막기 위한 조회 */
    boolean existsByUserIdAndReasonAndReferenceId(
            Long userId, LocalPassReason reason, Long referenceId);
}
