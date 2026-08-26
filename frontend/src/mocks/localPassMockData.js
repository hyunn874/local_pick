export const localPassSummary = {
  count: 3,
  ongoingProgress: 83,
};

export const earningMethods = [
  {
    id: 'signup',
    icon: '🎁',
    title: '가입 즉시 지급',
    description: '회원가입 완료',
    reward: '5개',
    alertTitle: '가입 보상',
    alertMessage: '회원가입 완료 시 즉시 5개 지급돼요!',
  },
  {
    id: 'activity',
    icon: '❤️',
    title: '활동 기준 충족',
    description: '좋아요 10 + 댓글 3 + 공유 2',
    reward: '2개',
    detail: '소통방에서 좋아요 10개 + 댓글 3개 + 공유 2개를 달성하면 자동으로 지급돼요.',
    alertTitle: '활동 보상',
    alertMessage: '좋아요 10 + 댓글 3 + 공유 2 달성 시 2개 지급!',
  },
  {
    id: 'picked',
    icon: '📍',
    title: '로컬픽 장소 채택',
    description: '좋아요 30 + 댓글 10 + 공유 5',
    reward: '5개',
    detail: '내가 올린 명소가 채택되면 자동으로 지급돼요. 소통방에서 명소를 공유해보세요.',
    alertTitle: '채택 보상',
    alertMessage: '좋아요 30 + 댓글 10 + 공유 5 달성 시 5개 지급!',
  },
];

export const usageHistory = [
  {
    id: 'cafe',
    place: '대전 유성구·봉명동 골목 카페',
    date: '04.18',
    amount: '-1개',
  },
  {
    id: 'gapcheon',
    place: '대전 유성구·갑천 산책로',
    date: '04.15',
    amount: '-1개',
  },
];
