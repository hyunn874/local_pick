package com.localpick.backend.global.security;

import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authorization: Bearer &lt;accessToken&gt; 헤더를 읽어 인증 컨텍스트를 채운다.
 *
 * 토큰이 없거나 유효하지 않으면 인증 없이 통과시킨다.
 * 실제 차단은 SecurityConfig 의 경로 규칙이 담당한다.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String HEADER = "Authorization";
    private static final String PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String token = resolveToken(request);

        if (token != null
                && jwtTokenProvider.isAccessToken(token)
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            Long userId = jwtTokenProvider.parseUserId(token);
            if (userId != null) {
                userRepository.findById(userId).ifPresent(user ->
                        setAuthentication(request, user));
            }
        }

        filterChain.doFilter(request, response);
    }

    private void setAuthentication(HttpServletRequest request, User user) {
        // 온보딩 완료 여부를 권한으로 구분해 두면 컨트롤러에서 분기하기 쉽다.
        List<SimpleGrantedAuthority> authorities = user.isOnboarded()
                ? List.of(new SimpleGrantedAuthority("ROLE_USER"),
                          new SimpleGrantedAuthority("ROLE_ONBOARDED"))
                : List.of(new SimpleGrantedAuthority("ROLE_USER"));

        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(user.getId(), null, authorities);
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader(HEADER);
        if (header != null && header.startsWith(PREFIX)) {
            return header.substring(PREFIX.length()).trim();
        }
        return null;
    }
}
