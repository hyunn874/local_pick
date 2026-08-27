let likeCounts = {};

export const setPostLikeCount = (postId, count, isLiked) => {
  if (postId === null || postId === undefined) {
    return;
  }

  likeCounts = {
    ...likeCounts,
    [String(postId)]: {
      count,
      isLiked,
    },
  };
};

export const getPostLikeCounts = () => likeCounts;
