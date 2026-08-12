import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
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

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';

const INITIAL_POSTS = [
  {
    id: 'post-1',
    author: '김유진',
    time: '12분 전',
    generationTag: '20대 추천',
    categoryTag: '카페',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085',
    title: '봉명동 골목 안쪽 조용한 로스터리',
    content: '주말 오후에도 좌석이 넉넉하고 직접 볶은 원두 향이 좋아요. 혼자 책 읽기에도 편한 곳이라 동네 명소로 추천합니다.',
    progress: 72,
    likes: 48,
    likedByMe: false,
    comments: 12,
  },
  {
    id: 'post-2',
    author: '박현우',
    time: '34분 전',
    generationTag: '가족 추천',
    categoryTag: '산책',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
    title: '갑천변 노을 산책 코스',
    content: '해질 무렵에 걷기 좋고 길이 넓어서 유모차도 편하게 이동할 수 있어요. 근처에 작은 쉼터도 있어서 쉬어가기 좋습니다.',
    progress: 58,
    likes: 31,
    likedByMe: false,
    comments: 8,
  },
];

function PostCard({ post, onPress, onToggleLike }) {
  return (
    <TouchableOpacity style={styles.postCard} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.postHeader}>
        <View style={styles.profileIcon}>
          <Text style={styles.profileInitial}>{post.author.slice(0, 1)}</Text>
        </View>
        <View style={styles.authorInfo}>
          <View style={styles.authorRow}>
            <Text style={styles.authorName}>{post.author}</Text>
            <View style={styles.residentBadge}>
              <Text style={styles.residentBadgeText}>거주자</Text>
            </View>
          </View>
          <Text style={styles.postTime}>{post.time}</Text>
        </View>
      </View>

      <Image
        source={{ uri: post.imageUrl }}
        style={styles.postImage}
        contentFit="cover"
        transition={300}
      />

      <View style={styles.tagRow}>
        <View style={styles.generationTag}>
          <Text style={styles.generationTagText}>{post.generationTag}</Text>
        </View>
        <View style={styles.categoryTag}>
          <Text style={styles.categoryTagText}>{post.categoryTag}</Text>
        </View>
      </View>

      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postContent} numberOfLines={2}>
        {post.content}
      </Text>

      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>채택까지</Text>
        <Text style={styles.progressPercent}>{post.progress}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${post.progress}%` }]} />
      </View>

      <View style={styles.postActions}>
        <TouchableOpacity activeOpacity={0.7} onPress={onToggleLike}>
          <Text style={[styles.actionText, post.likedByMe && styles.likedText]}>
            {post.likedByMe ? '♥' : '♡'} {post.likes}
          </Text>
        </TouchableOpacity>
        <Text style={styles.actionText}>댓글 {post.comments}</Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.shareIcon}>↗</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatRoomScreen() {
  const inputRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handlePostPress = () => {
    Alert.alert('상세보기', '상세 화면은 준비 중이에요!');
  };

  const handleToggleLike = (postId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const nextLikedByMe = !post.likedByMe;

        return {
          ...post,
          likedByMe: nextLikedByMe,
          likes: post.likes + (nextLikedByMe ? 1 : -1),
        };
      }),
    );
  };

  const handleSend = () => {
    if (!message.trim()) {
      return;
    }

    setMessage('');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('공유 완료', '명소가 소통방에 공유됐어요!');
  };

  const handleFocusComposer = () => {
    inputRef.current?.focus();
  };

  const handleRefresh = () => {
    setRefreshing(true);

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={88}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>대전 유성구 소통방</Text>
            <Text style={styles.subtitle}>거주자 인증 완료 ✓</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Text style={styles.iconButtonText}>⌕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
              <Text style={styles.iconButtonText}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          bounces
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.feedContent,
            posts.length === 0 && styles.emptyFeedContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={MAIN_GREEN}
              colors={[MAIN_GREEN]}
            />
          }
        >
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>아직 등록된 명소가 없어요</Text>
              <Text style={styles.emptyDescription}>첫 번째 로컬 명소를 공유해보세요!</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                activeOpacity={0.7}
                onPress={handleFocusComposer}
              >
                <Text style={styles.emptyButtonText}>명소 공유하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPress={handlePostPress}
                onToggleLike={() => handleToggleLike(post.id)}
              />
            ))
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="내 동네 명소를 공유해보세요..."
            placeholderTextColor="#9B9F98"
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.disabledSendButton]}
            activeOpacity={0.7}
            onPress={handleSend}
          >
            <Text style={styles.sendButtonText}>↑</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: MAIN_GREEN,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconButtonText: {
    color: MAIN_GREEN,
    fontSize: 22,
    fontWeight: '900',
  },
  feedContent: {
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  emptyFeedContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  postCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 16,
  },
  postHeader: {
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
  authorRow: {
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
  postImage: {
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 150,
    marginTop: 14,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
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
  postTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 12,
  },
  postContent: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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
    height: 7,
    marginTop: 7,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 999,
    height: '100%',
  },
  postActions: {
    alignItems: 'center',
    borderTopColor: BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 18,
    marginTop: 16,
    paddingTop: 13,
  },
  actionText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  likedText: {
    color: MAIN_GREEN,
  },
  shareIcon: {
    color: TEXT_SECONDARY,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 24,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyDescription: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: CARD,
    fontSize: 14,
    fontWeight: '900',
  },
  composer: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderTopColor: BORDER,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: BACKGROUND,
    borderRadius: 8,
    color: TEXT_PRIMARY,
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  sendButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  disabledSendButton: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: CARD,
    fontSize: 21,
    fontWeight: '900',
  },
});
