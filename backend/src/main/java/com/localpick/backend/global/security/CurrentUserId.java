package com.localpick.backend.global.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

/**
 * 컨트롤러 파라미터에 현재 로그인한 사용자 ID 를 주입한다.
 *
 * 사용 예)
 *   public ApiResponse&lt;UserResponse&gt; me(@CurrentUserId Long userId) { ... }
 *
 * 비로그인 요청에서는 null 이 들어온다.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@AuthenticationPrincipal(expression = "#this == 'anonymousUser' ? null : #this")
public @interface CurrentUserId {
}
