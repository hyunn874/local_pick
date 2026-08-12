package com.localpick.backend.domain.region;

import com.localpick.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@Table(
        name = "regions",
        indexes = @Index(name = "idx_region_code", columnList = "regionCode", unique = true)
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Region extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 법정동코드 앞 5자리 (시군구 단위) */
    @Column(nullable = false, unique = true, length = 5)
    private String regionCode;

    @Column(nullable = false, length = 20)
    private String sidoName;

    @Column(nullable = false, length = 30)
    private String sigunguName;

    /** 행정안전부 주민등록인구 */
    private Integer population;

    /** 면적 km² */
    private Double areaKm2;

    /** 인구밀도 명/km² */
    private Double populationDensity;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private DensityTier densityTier;

    /** 지도 초기 중심 좌표 (행정구역 대표점) */
    private Double centerLatitude;
    private Double centerLongitude;

    @Builder
    private Region(String regionCode, String sidoName, String sigunguName,
                   Double centerLatitude, Double centerLongitude) {
        this.regionCode = regionCode;
        this.sidoName = sidoName;
        this.sigunguName = sigunguName;
        this.centerLatitude = centerLatitude;
        this.centerLongitude = centerLongitude;
    }

    /** 인구·면적 갱신 시 밀도와 등급을 함께 재계산한다. */
    public void updatePopulation(int population, double areaKm2) {
        this.population = population;
        this.areaKm2 = areaKm2;
        this.populationDensity = areaKm2 > 0 ? population / areaKm2 : 0.0;
        this.densityTier = DensityTier.of(this.populationDensity);
    }

    public int getAdoptionThreshold() {
        return densityTier != null
                ? densityTier.getAdoptionThreshold()
                : DensityTier.MEDIUM.getAdoptionThreshold();
    }

    public String getFullName() {
        return sidoName + " " + sigunguName;
    }
}
