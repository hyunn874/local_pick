package com.localpick.backend.domain.region;

/**
 * regions.csv 한 줄을 표현하는 레코드.
 *
 * @param regionCode      법정동코드 앞 5자리
 * @param sidoName        시도명
 * @param sigunguName     시군구명
 * @param population      주민등록인구 (명)
 * @param areaKm2         면적 (km²)
 * @param centerLatitude  대표 위도 (지도 초기 중심)
 * @param centerLongitude 대표 경도
 */
public record RegionSeedRow(
        String regionCode,
        String sidoName,
        String sigunguName,
        Integer population,
        Double areaKm2,
        Double centerLatitude,
        Double centerLongitude
) {

    private static final int COLUMN_COUNT = 7;

    /** CSV 한 줄을 파싱한다. 빈 값은 null 로 둔다. */
    public static RegionSeedRow parse(String line) {
        String[] c = line.split(",", -1);
        if (c.length < COLUMN_COUNT) {
            throw new IllegalArgumentException(
                    "컬럼 수가 부족합니다. 기대 %d, 실제 %d → %s"
                            .formatted(COLUMN_COUNT, c.length, line));
        }
        return new RegionSeedRow(
                c[0].trim(),
                c[1].trim(),
                c[2].trim(),
                parseInt(c[3]),
                parseDouble(c[4]),
                parseDouble(c[5]),
                parseDouble(c[6])
        );
    }

    private static Integer parseInt(String v) {
        String s = v.trim().replace("\"", "").replace(",", "");
        return s.isEmpty() ? null : Integer.valueOf(s);
    }

    private static Double parseDouble(String v) {
        String s = v.trim().replace("\"", "").replace(",", "");
        return s.isEmpty() ? null : Double.valueOf(s);
    }

    public boolean hasPopulationData() {
        return population != null && areaKm2 != null && areaKm2 > 0;
    }

    public boolean isValid() {
        return regionCode != null && regionCode.length() == 5
                && !sidoName.isEmpty() && !sigunguName.isEmpty();
    }
}
