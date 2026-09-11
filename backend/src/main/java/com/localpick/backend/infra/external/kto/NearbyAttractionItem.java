package com.localpick.backend.infra.external.kto;

/**
 * 한국관광공사 국문관광정보서비스 locationBasedList1 응답 아이템.
 */
public record NearbyAttractionItem(
        String contentId,
        String title,
        String address,
        double longitude,
        double latitude,
        double distance,
        String imageUrl,
        String thumbnailUrl,
        String contentTypeId,
        String tel
) {

    /** contentTypeId → 한글 카테고리 라벨 */
    public String categoryLabel() {
        return switch (contentTypeId) {
            case "12" -> "관광지";
            case "14" -> "문화시설";
            case "15" -> "축제공연행사";
            case "25" -> "여행코스";
            case "28" -> "레포츠";
            case "32" -> "숙박";
            case "38" -> "쇼핑";
            case "39" -> "음식점";
            default -> "기타";
        };
    }
}
