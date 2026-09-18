package com.localpick.backend.domain.seed;

import com.localpick.backend.domain.comment.Comment;
import com.localpick.backend.domain.comment.CommentRepository;
import com.localpick.backend.domain.post.Post;
import com.localpick.backend.domain.post.PostLike;
import com.localpick.backend.domain.post.PostLikeRepository;
import com.localpick.backend.domain.post.PostRepository;
import com.localpick.backend.domain.prediction.PredictionResult;
import com.localpick.backend.domain.prediction.PredictionResultRepository;
import com.localpick.backend.domain.region.Region;
import com.localpick.backend.domain.region.RegionRepository;
import com.localpick.backend.domain.user.GenerationTag;
import com.localpick.backend.domain.user.User;
import com.localpick.backend.domain.user.UserRepository;
import com.localpick.backend.domain.verification.ResidentVerification;
import com.localpick.backend.domain.verification.ResidentVerificationRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Order(20)
@Component
@RequiredArgsConstructor
public class DemoDataSeeder implements ApplicationRunner {

    private static final String AUTHOR_PREFIX = "seed-localpick-author-";
    private static final String SUPPORTER_PREFIX = "seed-localpick-supporter-";
    private static final int ADOPTED_LIKES = Post.ADOPTION_LIKE_THRESHOLD;
    private static final int ADOPTED_COMMENTS = Post.ADOPTION_COMMENT_THRESHOLD;
    private static final int ADOPTED_SHARES = Post.ADOPTION_SHARE_THRESHOLD;

    private final UserRepository userRepository;
    private final RegionRepository regionRepository;
    private final ResidentVerificationRepository verificationRepository;
    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final CommentRepository commentRepository;
    private final PredictionResultRepository predictionResultRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.findByAppleId(AUTHOR_PREFIX + "seoul-jongno-1").isPresent()) {
            log.info("[DemoSeed] 기존 시드 데이터 확인 — 생성은 건너뛰고 시퀀스만 보정합니다.");
            seedPredictions();
            repairSequences();
            return;
        }

        List<User> supporters = createSupporters();
        for (RegionSeed seed : regionSeeds()) {
            seedRegion(seed, supporters);
        }
        seedPredictions();
        repairSequences();
        log.info("[DemoSeed] 심사용 시드 데이터 생성 완료");
    }

    private List<User> createSupporters() {
        List<User> supporters = new ArrayList<>();
        GenerationTag[] generations = GenerationTag.values();

        for (int i = 1; i <= ADOPTED_LIKES; i++) {
            User user = User.builder()
                    .appleId(SUPPORTER_PREFIX + i)
                    .profileImageUrl(null)
                    .build();
            user.completeOnboarding("응원러" + i, generations[(i - 1) % generations.length]);
            supporters.add(userRepository.save(user));
        }
        return supporters;
    }

    private void seedRegion(RegionSeed seed, List<User> supporters) {
        Region region = regionRepository.findByRegionCode(seed.regionCode())
                .orElseGet(() -> regionRepository.findBySidoNameAndSigunguName(seed.sidoName(), seed.sigunguName())
                        .orElseThrow(() -> new IllegalStateException("시드 지역을 찾을 수 없습니다: " + seed.fullName())));

        List<User> authors = createAuthors(seed, region);

        int authorIndex = 0;
        for (PlaceSeed place : seed.places()) {
            User author = authors.get(authorIndex % authors.size());
            Post post = createPlacePost(region, author, place);
            addEngagement(post, supporters, authors);
            authorIndex++;
        }

        for (int i = 0; i < seed.chats().size(); i++) {
            createChatPost(region, authors.get(i % authors.size()), seed.chats().get(i));
        }
    }

    private List<User> createAuthors(RegionSeed seed, Region region) {
        List<User> authors = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        GenerationTag[] generations = {
                GenerationTag.TWENTIES,
                GenerationTag.THIRTIES_FORTIES,
                GenerationTag.FIFTIES_PLUS
        };

        for (int i = 1; i <= 3; i++) {
            User user = User.builder()
                    .appleId(AUTHOR_PREFIX + seed.slug() + "-" + i)
                    .profileImageUrl(null)
                    .build();
            user.completeOnboarding(seed.nicknamePrefix() + i, generations[(i - 1) % generations.length]);
            user = userRepository.save(user);

            ResidentVerification verification = ResidentVerification.builder()
                    .user(user)
                    .region(region)
                    .build();
            verification.verify(now.minusDays(7));
            verification.markGpsVerified();
            verification.verify(now);
            verificationRepository.save(verification);
            authors.add(user);
        }
        return authors;
    }

    private Post createPlacePost(Region region, User author, PlaceSeed place) {
        String content = String.join("\n",
                "[장소유형] " + place.category(),
                "[위치/주소] " + place.address(),
                "[추천 이유] " + place.reason());

        Post post = Post.builder()
                .author(author)
                .region(region)
                .title(place.title())
                .content(content)
                .placeName(place.name())
                .latitude(region.getCenterLatitude())
                .longitude(region.getCenterLongitude())
                .generationTag(author.getGenerationTag())
                .imageUrls(List.of())
                .writtenByResident(true)
                .build();
        return postRepository.save(post);
    }

    private Post createChatPost(Region region, User author, ChatSeed chat) {
        Post post = Post.builder()
                .author(author)
                .region(region)
                .title(chat.title())
                .content(chat.content())
                .placeName(null)
                .latitude(region.getCenterLatitude())
                .longitude(region.getCenterLongitude())
                .generationTag(author.getGenerationTag())
                .imageUrls(List.of())
                .writtenByResident(true)
                .build();
        return postRepository.save(post);
    }

    private void addEngagement(Post post, List<User> supporters, List<User> authors) {
        for (int i = 0; i < ADOPTED_LIKES; i++) {
            postLikeRepository.save(PostLike.builder()
                    .post(post)
                    .user(supporters.get(i))
                    .build());
            post.increaseLikeCount();
        }

        for (int i = 0; i < ADOPTED_COMMENTS; i++) {
            commentRepository.save(Comment.builder()
                    .post(post)
                    .author(authors.get(i % authors.size()))
                    .content(commentTexts().get(i % commentTexts().size()))
                    .build());
        }

        for (int i = 0; i < ADOPTED_SHARES; i++) {
            post.increaseShareCount();
        }
        post.increaseAdoption();
        post.adoptIfEngagementThresholdMet(ADOPTED_COMMENTS, LocalDateTime.now().minusDays(1));
    }

    private void seedPredictions() {
        LocalDate thisMonday = LocalDate.now().with(DayOfWeek.MONDAY);
        LocalDate indicatorBaseYm = thisMonday.minusMonths(3).withDayOfMonth(1);

        seedPrediction(thisMonday, indicatorBaseYm, "51150", 90.0, 88.0, 82.0, 1);
        seedPrediction(thisMonday, indicatorBaseYm, "44150", 85.0, 82.0, 77.6, 2);
        seedPrediction(thisMonday, indicatorBaseYm, "46710", 82.0, 79.0, 76.2, 3);
    }

    private void seedPrediction(LocalDate weekStartDate, LocalDate indicatorBaseYm, String regionCode,
                                double visitorScore, double demandScore, double diversityScore, int ranking) {
        Region region = regionRepository.findByRegionCode(regionCode)
                .orElseThrow(() -> new IllegalStateException("예측 시드 지역을 찾을 수 없습니다: " + regionCode));
        PredictionResult result = predictionResultRepository
                .findByRegionIdAndWeekStartDate(region.getId(), weekStartDate)
                .orElseGet(() -> PredictionResult.builder()
                        .region(region)
                        .weekStartDate(weekStartDate)
                        .indicatorBaseYm(indicatorBaseYm)
                        .visitorScore(visitorScore)
                        .demandScore(demandScore)
                        .diversityScore(diversityScore)
                        .build());
        result.updateScores(indicatorBaseYm, visitorScore, demandScore, diversityScore);
        result.assignRanking(ranking);
        predictionResultRepository.save(result);
    }

    private void repairSequences() {
        List.of(
                "users",
                "resident_verifications",
                "posts",
                "comments",
                "post_likes",
                "prediction_results"
        ).forEach(this::repairSequence);
    }

    private void repairSequence(String tableName) {
        try {
            jdbcTemplate.execute("""
                    select setval(
                        pg_get_serial_sequence('%s', 'id'),
                        (select coalesce(max(id), 0) + 1 from %s),
                        false
                    )
                    """.formatted(tableName, tableName));
        } catch (RuntimeException e) {
            log.debug("[DemoSeed] {} 시퀀스 보정 건너뜀: {}", tableName, e.getMessage());
        }
    }

    private List<RegionSeed> regionSeeds() {
        return List.of(
                new RegionSeed("seoul-jongno", "서울특별시", "종로구", "11110", "서울로컬", List.of(
                        new PlaceSeed("서촌 계단집", "맛집", "서울 종로구 자하문로1길 15", "서촌 골목에서 오래 사랑받은 해산물 안주집입니다.", "퇴근 후 동네 주민들이 많이 찾는 곳이라 회전이 빠르고 분위기가 편해요."),
                        new PlaceSeed("청운문학도서관", "문화공간", "서울 종로구 자하문로36길 40", "한옥 도서관에서 쉬어가기 좋은 조용한 공간", "북악산 자락이라 산책과 독서를 같이 즐길 수 있어요."),
                        new PlaceSeed("인왕산 수성동계곡길", "산책로", "서울 종로구 옥인동 179-1", "동네 주민만 아는 전망 좋은 산책로입니다", "일몰 때 서울 성곽과 서촌 지붕이 같이 보여 특히 추천해요.")
                )),
                new RegionSeed("seoul-mapo", "서울특별시", "마포구", "11440", "마포로컬", List.of(
                        new PlaceSeed("망원시장 고로케 골목", "맛집", "서울 마포구 포은로8길 14", "망원시장 안쪽 간식 코스", "주말보다 평일 오후에 가면 줄이 짧고 시장 분위기를 느끼기 좋아요."),
                        new PlaceSeed("경의선숲길 연남 구간", "산책로", "서울 마포구 연남동 239-29", "연남동과 동교동을 잇는 생활 산책길", "카페보다 걷는 맛이 좋은 길이라 혼자 여행자에게도 좋아요."),
                        new PlaceSeed("문화비축기지 T6", "문화공간", "서울 마포구 증산로 87", "산업시설을 재생한 전시 공간", "넓고 조용해서 전시 없는 날에도 산책하기 좋습니다.")
                )),
                new RegionSeed("seoul-seongdong", "서울특별시", "성동구", "11200", "성동로컬", List.of(
                        new PlaceSeed("서울숲 은행나무길", "산책로", "서울 성동구 뚝섬로 273", "계절마다 색이 바뀌는 동네 산책길", "평일 오전에는 한적해서 주민들이 운동과 산책을 함께 즐기는 코스예요."),
                        new PlaceSeed("성수동 수제화거리", "문화공간", "서울 성동구 연무장길 일대", "오래된 공방과 새 가게가 공존하는 골목", "큰 카페만 보기보다 골목 안쪽 작업실을 함께 보면 성수의 분위기가 더 잘 느껴져요."),
                        new PlaceSeed("응봉산 팔각정", "전망대", "서울 성동구 응봉동 271", "한강과 도심 야경을 보는 작은 전망 명소", "오르막은 짧지만 전망이 좋아 동네 주민들이 자주 추천합니다.")
                )),
                new RegionSeed("busan-haeundae", "부산광역시", "해운대구", "26350", "해운대로컬", List.of(
                        new PlaceSeed("미포철길 산책로", "산책로", "부산 해운대구 달맞이길62번길 13", "바다와 철길을 같이 걷는 미포 산책 코스", "관광객이 빠진 이른 오전에 걸으면 파도 소리가 잘 들려요."),
                        new PlaceSeed("해리단길 작은 책방거리", "문화공간", "부산 해운대구 우동1로20번길 일대", "해운대역 뒤편 조용한 책방 골목", "바다만 보고 가기 아쉬울 때 동네 감성을 느끼기 좋습니다."),
                        new PlaceSeed("청사포 다릿돌전망대", "전망대", "부산 해운대구 청사포로 167", "바다 위를 걷는 듯한 전망대", "해질 무렵 색이 좋아 사진보다 직접 보는 풍경이 훨씬 좋아요.")
                )),
                new RegionSeed("busan-yeongdo", "부산광역시", "영도구", "26200", "영도로컬", List.of(
                        new PlaceSeed("흰여울문화마을 골목", "문화공간", "부산 영도구 흰여울길 379", "바다를 따라 이어지는 생활 골목", "사진 명소만 찍고 가기보다 골목 끝까지 걸으면 영도의 조용한 분위기가 보여요."),
                        new PlaceSeed("봉래산 둘레길", "자연", "부산 영도구 신선동 봉래산 일대", "영도 주민들이 추천하는 숲길 코스", "바다 전망과 숲길을 함께 볼 수 있어 복잡한 해변보다 여유롭습니다."),
                        new PlaceSeed("절영해안산책로", "산책로", "부산 영도구 절영로 160", "파도 소리를 가까이 듣는 해안 산책길", "저녁 시간대에는 바람이 좋아 천천히 걷기 좋은 로컬 코스예요.")
                )),
                new RegionSeed("daejeon-yuseong", "대전광역시", "유성구", "30200", "유성로컬", List.of(
                        new PlaceSeed("갑천 노을 산책로", "산책로", "대전 유성구 구성동 갑천변", "유성 주민들이 운동하러 자주 가는 갑천길", "해질 때 물빛이 좋아 천천히 걷기 좋고 자전거길도 편해요."),
                        new PlaceSeed("봉명동 온천 골목 카페", "카페", "대전 유성구 온천북로33번길 일대", "온천장 뒤편에 숨어 있는 조용한 카페 골목", "대형 카페보다 조용해서 여행 중 쉬어가기 좋아요."),
                        new PlaceSeed("유림공원 메타세쿼이아길", "자연", "대전 유성구 어은로 27", "계절마다 분위기가 바뀌는 공원 산책 명소", "봄과 가을에는 동네 주민들이 가장 많이 추천하는 산책 코스입니다.")
                )),
                new RegionSeed("daegu-jung", "대구광역시", "중구", "27110", "대구로컬", List.of(
                        new PlaceSeed("김광석 다시그리기길", "문화공간", "대구 중구 달구벌대로 2238", "골목 벽화와 작은 공연장이 이어지는 길", "번화가에서 살짝 벗어나 있어 천천히 걷기 좋습니다."),
                        new PlaceSeed("향촌문화관 골목", "문화공간", "대구 중구 중앙대로 449", "대구 근대 골목 분위기를 느낄 수 있는 공간", "어르신들이 들려주는 옛 이야기가 살아 있는 동네예요."),
                        new PlaceSeed("종로 진골목 식당가", "맛집", "대구 중구 진골목길 일대", "오래된 한식집과 다방이 남아 있는 골목", "화려하진 않지만 대구 중구의 오래된 맛을 느낄 수 있어요.")
                )),
                new RegionSeed("gwangju-dong", "광주광역시", "동구", "29110", "광주로컬", List.of(
                        new PlaceSeed("동명동 카페거리 뒷골목", "카페", "광주 동구 동명동 일대", "조용한 로스터리와 작은 공방이 모인 골목", "큰길보다 한 블록 안쪽에 들어가면 분위기 좋은 곳이 많아요."),
                        new PlaceSeed("푸른길공원 산책로", "산책로", "광주 동구 산수동 푸른길공원", "폐선 부지를 활용한 생활 산책길", "아침 시간에 걷기 좋고 동네 주민들의 일상이 잘 보입니다."),
                        new PlaceSeed("전일빌딩245 전망 공간", "전망대", "광주 동구 금남로 245", "광주 도심을 내려다보는 역사 공간", "전망과 전시를 함께 볼 수 있어 처음 방문한 사람에게 추천해요.")
                )),
                new RegionSeed("gyeonggi-suwon", "경기도", "수원시", "41110", "수원로컬", List.of(
                        new PlaceSeed("화성행궁 뒷골목", "문화공간", "경기 수원시 팔달구 정조로 825", "행궁 옆 조용한 공방과 가게 골목", "큰길보다 뒷골목에 작은 가게가 많아 천천히 둘러보기 좋아요."),
                        new PlaceSeed("방화수류정 용연길", "전망대", "경기 수원시 팔달구 수원천로392번길 44-6", "수원화성과 연못을 함께 보는 산책 명소", "밤 조명이 켜질 때 특히 아름답고 주민 산책 코스로 유명해요."),
                        new PlaceSeed("지동시장 순대타운", "맛집", "경기 수원시 팔달구 팔달문로 19", "현지인이 추천하는 시장 먹거리 코스", "관광지 식당보다 시장 안쪽이 훨씬 로컬 분위기가 살아 있어요.")
                )),
                new RegionSeed("gyeonggi-osan", "경기도", "오산시", "41370", "오산로컬", List.of(
                        new PlaceSeed("오산천 산책로", "산책로", "경기 오산시 오산천 일대", "퇴근 후 걷기 좋은 생활형 산책길", "봄에는 꽃길이 예쁘고 자전거와 산책 동선이 잘 나뉘어 있어요."),
                        new PlaceSeed("독산성 세마대지", "문화공간", "경기 오산시 지곶동 162-1", "오산의 역사를 느낄 수 있는 성곽 산책 명소", "높지 않은 코스라 가볍게 오르기 좋고 전망도 탁 트여 있습니다."),
                        new PlaceSeed("오색시장 먹거리 골목", "맛집", "경기 오산시 오산로272번길 22", "지역 주민들이 장 보며 들르는 시장 골목", "검색보다 현장에서 줄 선 가게를 따라가면 실패가 적어요.")
                )),
                new RegionSeed("gangwon-gangneung", "강원특별자치도", "강릉시", "51150", "강릉로컬", List.of(
                        new PlaceSeed("명주동 골목길", "문화공간", "강원 강릉시 명주동 일대", "작은 책방과 공방이 이어지는 강릉 원도심 골목", "바다보다 조용한 강릉을 보고 싶을 때 추천합니다."),
                        new PlaceSeed("남대천 억새길", "자연", "강원 강릉시 남대천 일대", "계절마다 풍경이 바뀌는 강변 산책길", "오전 햇살이 좋고 동네 주민들이 운동하는 길이라 편안해요."),
                        new PlaceSeed("초당 순두부 마을 안쪽집", "맛집", "강원 강릉시 초당순두부길 95-5", "초당동 안쪽에 숨어 있는 순두부집", "유명한 큰 식당보다 조용하고 담백한 맛을 찾는 사람에게 좋아요.")
                )),
                new RegionSeed("gangwon-sokcho", "강원특별자치도", "속초시", "51210", "속초로컬", List.of(
                        new PlaceSeed("청초호 호수공원길", "산책로", "강원 속초시 엑스포로 140", "호수와 설악산 능선을 함께 보는 산책길", "아침 시간에 걷기 좋고 바다보다 덜 붐벼서 주민들이 자주 찾습니다."),
                        new PlaceSeed("아바이마을 안쪽 골목", "맛집", "강원 속초시 청호로 122", "오징어순대와 함흥냉면집이 이어지는 골목", "큰 간판보다 오래된 작은 집들이 속초다운 맛을 보여줘요."),
                        new PlaceSeed("영랑호 범바위길", "전망대", "강원 속초시 영랑호반길 140", "호수 위로 설악산을 바라보는 전망 코스", "짧게 오를 수 있는데 풍경이 좋아 여행 첫 코스로 추천합니다.")
                )),
                new RegionSeed("jeju-jeju", "제주특별자치도", "제주시", "50110", "제주로컬", List.of(
                        new PlaceSeed("동문시장 야시장 골목", "맛집", "제주 제주시 관덕로14길 20", "저녁에 활기가 살아나는 제주 로컬 먹거리 골목", "관광객도 많지만 상인 추천 메뉴를 따라가면 실패가 적어요."),
                        new PlaceSeed("사라봉 산책로", "전망대", "제주 제주시 건입동 산지등대길", "제주시내와 바다를 함께 보는 동네 전망 산책로", "오르막이 짧고 일몰이 좋아 주민들이 자주 찾습니다."),
                        new PlaceSeed("탑동 해안 산책길", "산책로", "제주 제주시 탑동로 일대", "공항 근처에서 바다를 느끼기 좋은 해안길", "비행 전후로 짧게 걷기 좋고 밤바람이 시원해요.")
                ))
        );
    }

    private List<String> commentTexts() {
        return List.of(
                "여기는 저도 자주 가요. 시간대만 잘 맞추면 정말 조용합니다.",
                "주말 오전보다 평일 오후가 훨씬 여유로웠어요.",
                "가족이랑 같이 갔는데 동네 느낌이 살아 있어서 좋았습니다.",
                "사진보다 직접 가서 보는 분위기가 더 좋아요.",
                "처음 방문하는 분들께도 추천할 만한 코스입니다.",
                "근처 다른 장소랑 묶어서 다녀오면 더 좋아요.",
                "주민 추천이라는 말이 딱 맞는 곳이에요.",
                "혼자 산책하기에도 부담 없었습니다.",
                "가격이나 동선도 괜찮아서 다시 가고 싶어요.",
                "날씨 좋은 날 방문하면 만족도가 높을 것 같아요."
        );
    }

    private record RegionSeed(String slug, String sidoName, String sigunguName, String regionCode,
                              String nicknamePrefix, List<PlaceSeed> places) {

        String fullName() {
            return sidoName + " " + sigunguName;
        }

        List<ChatSeed> chats() {
            return List.of(
                    new ChatSeed("이번 주말 " + sigunguName + " 산책 코스 추천해주세요",
                            "멀리 이동하지 않고 반나절 정도 걷기 좋은 곳 있을까요? 조용한 길이면 더 좋아요."),
                    new ChatSeed("동네 카페 새로 발견했어요",
                            "큰길보다 안쪽 골목에 있는 작은 카페였는데 분위기가 편해서 다음에 또 가보려고요."),
                    new ChatSeed("비 오는 날 갈 만한 실내 공간 있나요?",
                            "아이랑 같이 가도 괜찮은 문화공간이나 작은 전시 있으면 알려주세요."),
                    new ChatSeed("시장 안쪽 맛집 추천 받아요",
                            "검색에 많이 안 나오는 오래된 식당 위주로 가보고 싶어요.")
            );
        }
    }

    private record PlaceSeed(String name, String category, String address, String title, String reason) {}

    private record ChatSeed(String title, String content) {}
}
