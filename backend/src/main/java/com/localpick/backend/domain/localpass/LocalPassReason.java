package com.localpick.backend.domain.localpass;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 로컬패스 적립/차감 사유와 기본 금액.
 *
 * 보상 금액은 지역과 무관하게 동일하다.
 * 지역 간 차이는 채택 임계값(DensityTier)으로만 조정한다.
 */
@Getter
@RequiredArgsConstructor
public enum LocalPassReason {

    SIGNUP_BONUS(5, "가입 축하"),
    POST_ADOPTED(50, "명소 채택"),
    FIRST_POST_IN_REGION(30, "발굴 지역 첫 제보"),
    RESIDENT_VERIFIED(20, "거주자 인증 완료"),
    ADOPTION_PARTICIPATED(5, "채택 참여"),
    REWARD_EXCHANGED(0, "리워드 교환");

    /** 기본 적립 금액. 차감 거래는 서비스에서 음수로 변환해 기록한다. */
    private final int amount;
    private final String label;
}
