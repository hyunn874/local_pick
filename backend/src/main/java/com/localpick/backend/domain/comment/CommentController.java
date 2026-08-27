package com.localpick.backend.domain.comment;

import com.localpick.backend.global.response.ApiResponse;
import com.localpick.backend.global.security.CurrentUserId;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    /** POST /api/posts/{postId}/comments — 댓글 작성 */
    @PostMapping
    public ApiResponse<CommentResponse> create(
            @CurrentUserId Long userId,
            @PathVariable Long postId,
            @Valid @RequestBody CommentCreateRequest request) {
        return ApiResponse.ok(commentService.create(userId, postId, request));
    }

    /** GET /api/posts/{postId}/comments — 댓글 목록 */
    @GetMapping
    public ApiResponse<List<CommentResponse>> list(@PathVariable Long postId) {
        return ApiResponse.ok(commentService.findAllByPost(postId));
    }
}
