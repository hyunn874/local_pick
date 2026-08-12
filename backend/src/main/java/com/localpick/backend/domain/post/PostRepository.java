package com.localpick.backend.domain.post;

import com.localpick.backend.domain.user.GenerationTag;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PostRepository extends JpaRepository<Post, Long> {

    Page<Post> findAllByRegionId(Long regionId, Pageable pageable);

    Page<Post> findAllByRegionIdAndGenerationTag(
            Long regionId, GenerationTag generationTag, Pageable pageable);

    /** 지도 핀 표시용 — 채택된 명소만 */
    List<Post> findAllByRegionIdAndAdoptedTrue(Long regionId);

    long countByRegionId(Long regionId);
}
