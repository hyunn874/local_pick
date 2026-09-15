package com.localpick.backend.domain.prediction;

public record WeeklyTopPredictionResponse(
        String regionCode,
        String regionName,
        double score,
        int rank
) {

    public static WeeklyTopPredictionResponse from(PredictionResult result) {
        return new WeeklyTopPredictionResponse(
                result.getRegion().getRegionCode(),
                result.getRegion().getFullName(),
                round(result.getTotalScore()),
                result.getRanking()
        );
    }

    private static double round(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
