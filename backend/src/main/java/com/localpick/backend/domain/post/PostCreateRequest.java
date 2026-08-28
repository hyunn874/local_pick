package com.localpick.backend.domain.post;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PostCreateRequest(
        @NotBlank @Size(min = 2, max = 50) String title,
        @NotBlank @Size(min = 10, max = 1000) String content,
        @Size(max = 100) String placeName,
        @NotNull String regionCode,
        @NotNull Double latitude,
        @NotNull Double longitude,
        List<String> imageUrls
) {}
