package com.localpick.backend.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INVALID_INPUT(HttpStatus.BAD_REQUEST, "C001", "입력값이 올바르지 않습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "C002", "서버 오류가 발생했습니다."),

    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "U001", "사용자를 찾을 수 없습니다."),

    REGION_NOT_FOUND(HttpStatus.NOT_FOUND, "R001", "지역을 찾을 수 없습니다."),

    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "P001", "게시글을 찾을 수 없습니다."),
    ALREADY_ADOPTED(HttpStatus.CONFLICT, "P002", "이미 채택에 참여했습니다."),
    NOT_RESIDENT(HttpStatus.FORBIDDEN, "P003", "해당 지역 거주자 인증이 필요합니다."),

    INSUFFICIENT_LOCALPASS(HttpStatus.BAD_REQUEST, "L001", "로컬패스 잔액이 부족합니다."),

    EXTERNAL_API_ERROR(HttpStatus.BAD_GATEWAY, "E001", "외부 API 호출에 실패했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
