let postCommentCounts = {};

export function setPostCommentCount(postId, count) {
  if (postId === null || postId === undefined) {
    return;
  }

  postCommentCounts = {
    ...postCommentCounts,
    [String(postId)]: count,
  };
}

export function getPostCommentCounts() {
  return postCommentCounts;
}
