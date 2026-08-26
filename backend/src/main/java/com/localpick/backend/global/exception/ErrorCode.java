package com.localpick.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INVALID_INPUT(HttpStatus.BAD_REQUEST, "C001", "입력값이 올바르지 않습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C002", "서버 오류가 발생했습니다."),

    // 인증
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "A001", "로그인이 필요합니다."),
    INVALID_TOKEN(HttpStatus.UNAUTHORIZED, "A002", "유효하지 않은 토큰입니다."),
    EXPIRED_TOKEN(HttpStatus.UNAUTHORIZED, "A003", "토큰이 만료되었습니다. 다시 로그인해 주세요."),
    KAKAO_AUTH_FAILED(HttpStatus.UNAUTHORIZED, "A004", "카카오 로그인에 실패했습니다."),
    APPLE_AUTH_FAILED(HttpStatus.UNAUTHORIZED, "A006", "Apple 로그인에 실패했습니다."),
    ONBOARDING_REQUIRED(HttpStatus.FORBIDDEN, "A005", "닉네임과 세대 설정을 완료해 주세요."),

    // 회원
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "사용자를 찾을 수 없습니다."),
    NICKNAME_DUPLICATED(HttpStatus.CONFLICT, "U002", "이미 사용 중인 닉네임입니다."),
    ALREADY_ONBOARDED(HttpStatus.CONFLICT, "U003", "이미 설정을 완료한 계정입니다."),

    // 지역
    REGION_NOT_FOUND(HttpStatus.NOT_FOUND, "R001", "지역을 찾을 수 없습니다."),

    // 게시글·채택
    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "P001", "게시글을 찾을 수 없습니다."),
    ALREADY_ADOPTED(HttpStatus.CONFLICT, "P002", "이미 채택에 참여했습니다."),
    NOT_RESIDENT(HttpStatus.FORBIDDEN, "P003", "해당 지역 거주자 인증이 필요합니다."),
    NOT_POST_AUTHOR(HttpStatus.FORBIDDEN, "P004", "본인이 작성한 글만 수정할 수 있습니다."),

    // 로컬패스
    INSUFFICIENT_LOCALPASS(HttpStatus.BAD_REQUEST, "L001", "로컬패스 잔액이 부족합니다."),

    // 외부 연동
    EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "E001", "외부 API 호출에 실패했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
