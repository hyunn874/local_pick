package com.localpick.backend.domain.post;

import com.localpick.backend.global.response.ApiResponse;
import com.localpick.backend.global.security.CurrentUserId;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    /** POST /api/posts/{postId}/like — 좋아요 토글 */
    @PostMapping("/{postId}/like")
    public ApiResponse<LikeResponse> toggleLike(
            @CurrentUserId Long userId,
            @PathVariable Long postId) {
        return ApiResponse.ok(postService.toggleLike(userId, postId));
    }
}
