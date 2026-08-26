import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';

import { useAuth } from '../contexts/AuthContext';
import { setPostCommentCount } from '../state/postCommentCounts';
import { setPostLikeCount } from '../state/postLikeCounts';
import { setMyPostProgress } from '../state/myPostProgress';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const TARGET_LIKES = 30;
const INITIAL_COMMENTS = [
  {
    id: 1,
    author: '유성구주민',
    isResident: true,
    content: '저도 자주 가는 곳이에요! 특히 주말 오전이 한적해서 좋아요 😊',
    time: '2시간 전',
    likes: 5,
    isLiked: false,
  },
  {
    id: 2,
    author: '대전여행자',
    isResident: false,
    content: '다음에 대전 가면 꼭 들러볼게요! 주차는 어떤가요?',
    time: '1시간 전',
    likes: 2,
    isLiked: false,
  },
];

function createInitialComments(commentCount) {
  if (commentCount <= 0) {
    return [];
  }

  const baseComments = INITIAL_COMMENTS.slice(0, Math.min(commentCount, INITIAL_COMMENTS.length));
  const additionalComments = Array.from(
    { length: Math.max(0, commentCount - INITIAL_COMMENTS.length) },
    (_, index) => ({
      id: `restored-${index + 1}`,
      author: '나',
      isResident: true,
      content: '방금 전 작성한 댓글입니다.',
      time: '방금 전',
      likes: 0,
      isLiked: false,
    }),
  );

  return [...additionalComments, ...baseComments];
}

function writeOngoingPick(post, likes, progress) {
  setMyPostProgress({
    title: post.title,
    progress,
    likes,
    targetLikes: post.targetLikes ?? TARGET_LIKES,
  });
}

function CommentCard({ comment, onToggleLike }) {
  return (
    <View style={styles.commentCard}>
      <View style={styles.commentProfileIcon}>
        <Text style={styles.commentProfileInitial}>{comment.author.slice(0, 1)}</Text>
      </View>
      <View style={styles.commentBody}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAuthorRow}>
            <Text style={styles.commentAuthor}>{comment.author}</Text>
            {comment.isResident && (
              <View style={styles.commentResidentBadge}>
                <Text style={styles.commentResidentBadgeText}>거주자</Text>
              </View>
            )}
          </View>
          <Text style={styles.commentTime}>{comment.time}</Text>
        </View>
        <Text style={styles.commentContent}>{comment.content}</Text>
        <TouchableOpacity
          style={styles.commentLikeButton}
          activeOpacity={0.7}
          onPress={onToggleLike}
        >
          <Text style={[styles.commentLikeText, comment.isLiked && styles.activeCommentLikeText]}>
            {comment.isLiked ? '♥' : '♡'} {comment.likes}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PostDetailScreen({ navigation, route }) {
  const { user } = useAuth();
  const post = route.params?.post;
  const [commentText, setCommentText] = useState('');
  const [isLiked, setIsLiked] = useState(Boolean(post?.likedByMe ?? post?.isLiked));
  const [likeCount, setLikeCount] = useState(post?.likes ?? 0);
  const [comments, setComments] = useState(() => createInitialComments(post?.comments ?? 0));
  const [progress, setProgress] = useState(post?.progress ?? 0);
  const commentCount = comments.length;

  const imageSource = post?.imageUrl || post?.image;
  const generationTag = post?.generationTag || post?.ageTag || '전체';
  const categoryTag = post?.categoryTag || '기타';
  const isCommentEmpty = !commentText.trim();

  const handleToggleLike = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLiked((current) => {
      const nextIsLiked = !current;
      const nextLikes = likeCount + (current ? -1 : 1);
      const nextProgress = Math.min(
        100,
        Math.round((nextLikes / (post?.targetLikes ?? TARGET_LIKES)) * 100),
      );

      setLikeCount(nextLikes);
      setProgress(nextProgress);
      setPostLikeCount(post?.id, nextLikes, nextIsLiked);

      if (post?.isMine) {
        writeOngoingPick(post, nextLikes, nextProgress);
      }

      return nextIsLiked;
    });
  };

  const handleSendComment = () => {
    if (isCommentEmpty) {
      Alert.alert('내용을 입력해주세요', '댓글 내용을 작성해주세요.');
      return;
    }

    const nextComment = {
      id: Date.now(),
      author: user?.nickname || '나',
      isResident: true,
      content: commentText.trim(),
      time: '방금 전',
      likes: 0,
      isLiked: false,
    };
    setComments((currentComments) => {
      const nextComments = [nextComment, ...currentComments];

      setPostCommentCount(post?.id, nextComments.length);
      return nextComments;
    });
    setCommentText('');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleToggleCommentLike = (commentId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setComments((currentComments) =>
      currentComments.map((comment) => {
        if (comment.id !== commentId) {
          return comment;
        }

        const nextLiked = !comment.isLiked;

        return {
          ...comment,
          isLiked: nextLiked,
          likes: comment.likes + (nextLiked ? 1 : -1),
        };
      }),
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={MAIN_GREEN} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시글</Text>
          <View style={styles.headerSpacer} />
        </View>

        {post ? (
          <>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <View style={styles.card}>
                <View style={styles.authorRow}>
                  <View style={styles.profileIcon}>
                    <Text style={styles.profileInitial}>{post.author?.slice(0, 1) || '나'}</Text>
                  </View>
                  <View style={styles.authorInfo}>
                    <View style={styles.authorNameRow}>
                      <Text style={styles.authorName}>{post.author || '나'}</Text>
                      <View style={styles.residentBadge}>
                        <Text style={styles.residentBadgeText}>거주자</Text>
                      </View>
                    </View>
                    <Text style={styles.postTime}>{post.time || '방금 전'}</Text>
                  </View>
                </View>

                <View style={styles.tagRow}>
                  <View style={styles.generationTag}>
                    <Text style={styles.generationTagText}>{generationTag}</Text>
                  </View>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{categoryTag}</Text>
                  </View>
                </View>

                {imageSource ? (
                  <Image
                    source={{ uri: imageSource }}
                    style={styles.postImage}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={32} color={TEXT_SECONDARY} />
                    <Text style={styles.imagePlaceholderText}>이미지 없음</Text>
                  </View>
                )}

                <Text style={styles.postTitle}>{post.title}</Text>
                {post.location && (
                  <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={15} color="#7A9B8A" />
                    <Text style={styles.locationText}>{post.location}</Text>
                  </View>
                )}
                <Text style={styles.postContent}>{post.content}</Text>

                <View style={styles.divider} />

                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>채택까지</Text>
                  <Text style={styles.progressPercent}>{progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>

                <View style={styles.countRow}>
                  <Text style={styles.countText}>좋아요 {likeCount}</Text>
                  <Text style={styles.countText}>댓글 {commentCount}</Text>
                </View>
              </View>

              <View style={styles.commentSection}>
                <Text style={styles.commentSectionTitle}>댓글 {commentCount}개</Text>
                <View style={styles.commentList}>
                  {comments.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      onToggleLike={() => handleToggleCommentLike(comment.id)}
                    />
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.actionBar}>
              <TouchableOpacity
                style={[styles.likeButton, isLiked && styles.activeLikeButton]}
                activeOpacity={0.7}
                onPress={handleToggleLike}
              >
                <Text style={[styles.likeButtonText, isLiked && styles.activeLikeButtonText]}>
                  {isLiked ? '♥' : '♡'} {likeCount}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.commentInput}
                value={commentText}
                onChangeText={setCommentText}
                placeholder="댓글을 입력해주세요..."
                placeholderTextColor="#9B9F98"
              />
              <TouchableOpacity
                style={[styles.sendButton, isCommentEmpty && styles.disabledSendButton]}
                activeOpacity={0.7}
                disabled={isCommentEmpty}
                onPress={handleSendComment}
              >
                <Text style={styles.sendButtonText}>전송</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>게시글을 찾을 수 없어요</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BACKGROUND,
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 16,
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    color: MAIN_GREEN,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    padding: 20,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 18,
  },
  authorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  profileIcon: {
    alignItems: 'center',
    backgroundColor: '#E7EFE9',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  profileInitial: {
    color: MAIN_GREEN,
    fontSize: 16,
    fontWeight: '900',
  },
  authorInfo: {
    flex: 1,
  },
  authorNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  authorName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
  },
  residentBadge: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  residentBadgeText: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  postTime: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 3,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 16,
  },
  generationTag: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  generationTagText: {
    color: MAIN_GREEN,
    fontSize: 11,
    fontWeight: '900',
  },
  categoryTag: {
    backgroundColor: '#F1E7D7',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  categoryTagText: {
    color: '#8B5E22',
    fontSize: 11,
    fontWeight: '900',
  },
  postImage: {
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 190,
    marginTop: 16,
  },
  imagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    gap: 8,
    height: 190,
    justifyContent: 'center',
    marginTop: 16,
  },
  imagePlaceholderText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '900',
  },
  postTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    marginTop: 18,
  },
  locationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 7,
  },
  locationText: {
    color: '#7A9B8A',
    fontSize: 13,
    fontWeight: '800',
  },
  postContent: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  divider: {
    backgroundColor: BORDER,
    height: 1,
    marginTop: 22,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  progressLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
  },
  progressPercent: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: '#ECE8E0',
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 999,
    height: '100%',
  },
  countRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 16,
  },
  countText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  commentSection: {
    marginTop: 18,
  },
  commentSectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '900',
  },
  commentList: {
    gap: 10,
    marginTop: 12,
  },
  commentCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  commentProfileIcon: {
    alignItems: 'center',
    backgroundColor: '#E7EFE9',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  commentProfileInitial: {
    color: MAIN_GREEN,
    fontSize: 14,
    fontWeight: '900',
  },
  commentBody: {
    flex: 1,
  },
  commentHeader: {
    gap: 4,
  },
  commentAuthorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  commentAuthor: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '900',
  },
  commentResidentBadge: {
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  commentResidentBadgeText: {
    color: MAIN_GREEN,
    fontSize: 10,
    fontWeight: '900',
  },
  commentTime: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
  },
  commentContent: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  commentLikeButton: {
    alignSelf: 'flex-start',
    marginTop: 9,
  },
  commentLikeText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '900',
  },
  activeCommentLikeText: {
    color: MAIN_GREEN,
  },
  actionBar: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderTopColor: BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  likeButton: {
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    borderRadius: 999,
    minWidth: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activeLikeButton: {
    backgroundColor: '#E7EFE9',
  },
  likeButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '900',
  },
  activeLikeButtonText: {
    color: MAIN_GREEN,
  },
  commentInput: {
    backgroundColor: BACKGROUND,
    borderRadius: 8,
    color: TEXT_PRIMARY,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  disabledSendButton: {
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: CARD,
    fontSize: 13,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '900',
  },
});
