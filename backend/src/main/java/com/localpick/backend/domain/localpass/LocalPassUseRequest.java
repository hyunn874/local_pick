package com.localpick.backend.domain.localpass;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record LocalPassUseRequest(
        @NotNull @Min(1) Integer amount,
        @NotNull LocalPassReason reason
) {}
