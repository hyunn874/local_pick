package com.localpick.backend.domain.prediction;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 지표값을 0~100 점수로 변환한다.
 *
 * 최소-최대 정규화가 아니라 백분위 순위를 쓴다. 관광 데이터는 분포가 극단적으로
 * 치우쳐 있어서 — 강남구·제주시 한두 곳이 전국 최댓값을 끌어올린다 — 최소-최대로
 * 자르면 나머지 250여 개 지역이 전부 0점 근처에 뭉개진다. 그러면 하위권 안에서
 * 어디가 더 소외됐는지 구분이 안 되는데, 로컬픽이 정작 보고 싶은 곳이 바로 그 구간이다.
 *
 * 백분위는 순위만 쓰므로 이상치에 흔들리지 않고, 지표별 단위(비율·금액·명)가 달라도
 * 그대로 합산할 수 있다. 대신 "1위와 2위의 실제 격차"는 사라진다는 점은 감수한다.
 * 로컬픽은 절대 수치가 아니라 상대 소외 순위를 뽑는 것이 목적이므로 맞는 교환이다.
 *
 * 동점은 평균 순위로 처리한다. 값이 0 인 지역이 여럿일 때 입력 순서에 따라
 * 점수가 갈리는 것을 막기 위해서다.
 */
public final class Normalizer {

    /** 지표가 없는 지역에 주는 중립 점수. 순위를 밀지도 당기지도 않는다. */
    public static final double NEUTRAL = 50.0;

    private Normalizer() {
    }

    /** 값이 작을수록 높은 점수. 방문자수·수요 강도·다양성 모두 여기에 해당한다. */
    public static Map<Long, Double> reverseScore(Map<Long, Double> raw) {
        return percentile(raw, true);
    }

    /** 값이 클수록 높은 점수. */
    public static Map<Long, Double> forwardScore(Map<Long, Double> raw) {
        return percentile(raw, false);
    }

    private static Map<Long, Double> percentile(Map<Long, Double> raw, boolean reverse) {
        Map<Long, Double> result = new HashMap<>();
        if (raw == null || raw.isEmpty()) {
            return result;
        }
        if (raw.size() == 1) {
            raw.keySet().forEach(key -> result.put(key, NEUTRAL));
            return result;
        }

        List<Map.Entry<Long, Double>> sorted = new ArrayList<>(raw.entrySet());
        sorted.sort(Comparator.comparingDouble(Map.Entry::getValue));

        int n = sorted.size();
        int i = 0;
        while (i < n) {
            int j = i;
            double value = sorted.get(i).getValue();
            while (j + 1 < n && Double.compare(sorted.get(j + 1).getValue(), value) == 0) {
                j++;
            }

            double averageRank = (i + j) / 2.0;              // 0-based 평균 순위
            double ascending = averageRank / (n - 1);        // 0(최솟값) ~ 1(최댓값)
            double score = (reverse ? 1.0 - ascending : ascending) * 100.0;

            for (int k = i; k <= j; k++) {
                result.put(sorted.get(k).getKey(), score);
            }
            i = j + 1;
        }
        return result;
    }
}
