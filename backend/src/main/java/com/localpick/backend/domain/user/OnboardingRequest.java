package com.localpick.backend.domain.user;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 온보딩 — 닉네임과 세대 태그 설정 */
public record OnboardingRequest(
        @NotNull(message = "닉네임을 입력해 주세요.")
        @Size(min = 2, max = 12, message = "닉네임은 2~12자로 입력해 주세요.")
        @Pattern(regexp = "^[가-힣a-zA-Z0-9_]+$",
                message = "닉네임은 한글, 영문, 숫자, 밑줄만 사용할 수 있습니다.")
        String nickname,

        @NotNull(message = "세대를 선택해 주세요.")
        GenerationTag generationTag
) {}
