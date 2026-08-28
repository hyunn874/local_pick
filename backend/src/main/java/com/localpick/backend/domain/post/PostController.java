package com.localpick.backend.domain.post;

import com.localpick.backend.global.response.ApiResponse;
import com.localpick.backend.global.security.CurrentUserId;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    /** GET /api/posts?region={regionCode}&page=0&size=20 — 게시글 목록 */
    @GetMapping
    public ApiResponse<List<PostResponse>> list(
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(postService.findAll(region, page, size));
    }

    /** GET /api/posts/{postId} — 게시글 상세 */
    @GetMapping("/{postId}")
    public ApiResponse<PostResponse> detail(@PathVariable Long postId) {
        return ApiResponse.ok(postService.findById(postId));
    }

    /** POST /api/posts — 게시글 작성 */
    @PostMapping
    public ApiResponse<PostResponse> create(
            @CurrentUserId Long userId,
            @Valid @RequestBody PostCreateRequest request) {
        return ApiResponse.ok(postService.create(userId, request));
    }

    /** POST /api/posts/{postId}/like — 좋아요 토글 */
    @PostMapping("/{postId}/like")
    public ApiResponse<LikeResponse> toggleLike(
            @CurrentUserId Long userId,
            @PathVariable Long postId) {
        return ApiResponse.ok(postService.toggleLike(userId, postId));
    }

    /** POST /api/posts/{postId}/adopt — 채택 투표 */
    @PostMapping("/{postId}/adopt")
    public ApiResponse<AdoptionResponse> adopt(
            @CurrentUserId Long userId,
            @PathVariable Long postId) {
        return ApiResponse.ok(postService.vote(userId, postId));
    }

    /** PUT /api/posts/{postId} — 게시글 수정 */
    @PutMapping("/{postId}")
    public ApiResponse<PostResponse> update(
            @CurrentUserId Long userId,
            @PathVariable Long postId,
            @Valid @RequestBody PostCreateRequest request) {
        return ApiResponse.ok(postService.update(userId, postId, request));
    }

    /** DELETE /api/posts/{postId} — 게시글 삭제 */
    @DeleteMapping("/{postId}")
    public ApiResponse<Void> delete(
            @CurrentUserId Long userId,
            @PathVariable Long postId) {
        postService.delete(userId, postId);
        return ApiResponse.ok(null);
    }
}
