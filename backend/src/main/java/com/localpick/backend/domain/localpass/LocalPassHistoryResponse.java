package com.localpick.backend.domain.localpass;

import java.time.LocalDateTime;

public record LocalPassHistoryResponse(
        Long id,
        int amount,
        String reason,
        String reasonLabel,
        Long referenceId,
        int balanceAfter,
        LocalDateTime createdAt
) {

    public static LocalPassHistoryResponse from(LocalPassHistory h) {
        return new LocalPassHistoryResponse(
                h.getId(),
                h.getAmount(),
                h.getReason().name(),
                h.getReason().getLabel(),
                h.getReferenceId(),
                h.getBalanceAfter(),
                h.getCreatedAt()
        );
    }
}
