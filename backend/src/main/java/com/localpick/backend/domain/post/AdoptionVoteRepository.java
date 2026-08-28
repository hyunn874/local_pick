package com.localpick.backend.domain.post;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdoptionVoteRepository extends JpaRepository<AdoptionVote, Long> {

    Optional<AdoptionVote> findByPostIdAndUserId(Long postId, Long userId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);
}
