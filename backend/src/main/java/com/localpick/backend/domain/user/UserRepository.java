package com.localpick.backend.domain.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByKakaoId(String kakaoId);

    Optional<User> findByAppleId(String appleId);

    boolean existsByNickname(String nickname);
}
