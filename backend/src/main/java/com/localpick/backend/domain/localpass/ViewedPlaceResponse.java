package com.localpick.backend.domain.localpass;

import com.localpick.backend.domain.post.AdoptedPlaceResponse;
import java.time.LocalDateTime;

public record ViewedPlaceResponse(
        AdoptedPlaceResponse place,
        LocalDateTime viewedAt
) {

    public static ViewedPlaceResponse from(PlaceView view) {
        return new ViewedPlaceResponse(
                AdoptedPlaceResponse.from(view.getPlace()),
                view.getCreatedAt()
        );
    }
}
