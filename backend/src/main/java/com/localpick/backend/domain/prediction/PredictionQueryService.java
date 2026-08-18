package com.localpick.backend.domain.prediction;

import com.localpick.backend.domain.visitor.VisitorCollectService;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PredictionQueryService {

    private final PredictionResultRepository predictionResultRepository;

    /**
     * 홈 화면 "이 주의 발굴 지역" TOP3.
     *
     * @param week null 이면 예측이 돌아간 가장 최근 주를 쓴다. 공사 방문자수 데이터가
     *             실시간이 아니라 프론트가 이번 주 날짜로 물으면 빈 응답이 나오기 때문에,
     *             날짜를 생략하는 쪽을 기본 사용법으로 둔다.
     */
    public PredictionResponse findFeatured(LocalDate week) {
        return find(week, PredictionResult.FEATURED_COUNT);
    }

    /** 예측 페이지 전체 순위. limit 로 잘라 본다. */
    public PredictionResponse findRanking(LocalDate week, int limit) {
        return find(week, limit);
    }

    private PredictionResponse find(LocalDate week, int limit) {
        LocalDate target = resolveWeek(week);
        if (target == null) {
            return new PredictionResponse(null, null, 0, List.of());
        }

        List<PredictionResult> results = predictionResultRepository
                .findByWeekStartDateAndRankingLessThanEqualOrderByRankingAsc(target, Math.max(1, limit));

        LocalDate indicatorBaseYm = results.isEmpty() ? null : results.get(0).getIndicatorBaseYm();

        return new PredictionResponse(
                target,
                indicatorBaseYm,
                results.size(),
                results.stream().map(PredictionResponse.Item::from).toList()
        );
    }

    private LocalDate resolveWeek(LocalDate week) {
        if (week != null) {
            return VisitorCollectService.weekStartOf(week);
        }
        return predictionResultRepository.findLatestWeekStartDate().orElse(null);
    }
}
