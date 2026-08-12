package com.localpick.backend.domain.region;

/** 지역 조회 응답 */
public record RegionResponse(
        Long id,
        String regionCode,
        String sidoName,
        String sigunguName,
        String fullName,
        Integer population,
        Double areaKm2,
        Double populationDensity,
        DensityTier densityTier,
        int adoptionThreshold,
        Double centerLatitude,
        Double centerLongitude
) {

    public static RegionResponse from(Region region) {
        return new RegionResponse(
                region.getId(),
                region.getRegionCode(),
                region.getSidoName(),
                region.getSigunguName(),
                region.getFullName(),
                region.getPopulation(),
                region.getAreaKm2(),
                region.getPopulationDensity(),
                region.getDensityTier(),
                region.getAdoptionThreshold(),
                region.getCenterLatitude(),
                region.getCenterLongitude()
        );
    }
}
