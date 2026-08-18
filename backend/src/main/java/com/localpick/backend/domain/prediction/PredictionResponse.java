package com.localpick.backend.domain.prediction;

import com.localpick.backend.domain.region.Region;
import java.time.LocalDate;
import java.util.List;

/**
 * 예측 결과 응답 DTO 묶음.
 *
 * Region 이 LAZY 연관이고 open-in-view 가 꺼져 있어, 컨트롤러에서 엔티티를 그대로
 * 직렬화하면 세션이 닫힌 뒤라 실패한다. 트랜잭션 경계 안에서 이 형태로 바꿔 내보낸다.
 */
public record PredictionResponse(
        LocalDate weekStartDate,
        /** 수요 강도·다양성에 사용된 지표 기준 월. 화면에 "○○년 ○월 기준"으로 표기한다. */
        LocalDate indicatorBaseYm,
        int totalRegions,
        List<Item> regions
) {

    public record Item(
            int ranking,
            Long regionId,
            String regionCode,
            String regionName,
            /** 소외도 총점 0~100. 높을수록 소외됐다는 뜻. */
            double totalScore,
            double visitorScore,
            double demandScore,
            double diversityScore,
            Double centerLatitude,
            Double centerLongitude
    ) {

        public static Item from(PredictionResult result) {
            Region region = result.getRegion();
            return new Item(
                    result.getRanking(),
                    region.getId(),
                    region.getRegionCode(),
                    region.getFullName(),
                    round(result.getTotalScore()),
                    round(result.getVisitorScore()),
                    round(result.getDemandScore()),
                    round(result.getDiversityScore()),
                    region.getCenterLatitude(),
                    region.getCenterLongitude()
            );
        }

        private static double round(double value) {
            return Math.round(value * 10) / 10.0;
        }
    }
}
