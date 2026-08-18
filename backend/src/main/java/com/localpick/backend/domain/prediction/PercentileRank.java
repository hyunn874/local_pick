package com.localpick.backend.domain.prediction;

import java.util.Arrays;

/**
 * 백분위 순위 정규화 (0~100).
 *
 * min-max 를 쓰지 않는 이유: 방문자수 분포는 상위 몇 개 지역이 극단적으로 커서
 * min-max 를 걸면 나머지 대부분이 한쪽에 뭉개져 순위가 사실상 사라진다.
 * 백분위는 분포 모양과 무관하게 항상 고르게 퍼진다.
 *
 * 동점은 평균 순위(midrank)로 처리한다.
 */
public final class PercentileRank {

    private PercentileRank() {
    }

    /** 값이 클수록 100 에 가깝다. */
    public static double[] of(double[] values) {
        int n = values.length;
        if (n == 0) return new double[0];
        if (n == 1) return new double[]{50.0};

        Integer[] idx = new Integer[n];
        for (int i = 0; i < n; i++) idx[i] = i;
        Arrays.sort(idx, (a, b) -> Double.compare(values[a], values[b]));

        double[] out = new double[n];
        int i = 0;
        while (i < n) {
            int j = i;
            while (j + 1 < n && values[idx[j + 1]] == values[idx[i]]) j++;
            double midRank = (i + j) / 2.0;
            double score = midRank / (n - 1) * 100.0;
            for (int k = i; k <= j; k++) out[idx[k]] = score;
            i = j + 1;
        }
        return out;
    }

    /** 값이 작을수록 100 에 가깝다. 소외도 계산의 기본형. */
    public static double[] reversed(double[] values) {
        double[] scores = of(values);
        for (int i = 0; i < scores.length; i++) {
            scores[i] = 100.0 - scores[i];
        }
        return scores;
    }
}
