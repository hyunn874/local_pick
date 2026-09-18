package com.localpick.backend.domain.localpass;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 로컬패스 적립/차감 사유와 기본 금액.
 *
 * 보상 금액은 제안서 v8 기준을 따른다.
 */
@Getter
@RequiredArgsConstructor
public enum LocalPassReason {

    SIGNUP_BONUS(5, "가입 축하"),
    ACTIVITY_THRESHOLD(2, "활동 기준 충족"),
    POST_ADOPTED(5, "명소 채택"),
    FIRST_POST_IN_REGION(30, "발굴 지역 첫 제보"),
    RESIDENT_VERIFIED(20, "거주자 인증 완료"),
    ADOPTION_PARTICIPATED(0, "채택 참여"),
    PLACE_VIEWED(-1, "명소 열람"),
    REWARD_EXCHANGED(0, "리워드 교환");

    /** 기본 적립 금액. 차감 거래는 서비스에서 음수로 변환해 기록한다. */
    private final int amount;
    private final String label;
}
