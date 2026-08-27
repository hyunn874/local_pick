import { useCallback, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { initialPosts } from '../mocks/chatRoomMockData';
import { getPostCommentCounts } from '../state/postCommentCounts';
import { getPostLikeCounts } from '../state/postLikeCounts';
import { setMyPostProgress } from '../state/myPostProgress';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const ORANGE = '#D88A24';
const GRAY = '#8A918A';
const AGE_TAGS = ['20대', '30-40대', '50대+'];
const TARGET_LIKES = 30;

function normalizePost(post) {
  const likes = Number(post.likes ?? post.likeCount ?? 0);
  const targetLikes = Number(post.targetLikes ?? TARGET_LIKES);

  return {
    id: post.id ?? post.postId,
    author: post.author?.nickname || post.authorName || post.author || '로컬픽 사용자',
    isResident: Boolean(post.isResident ?? post.author?.isResidentVerified),
    time: post.time || post.createdAt || '방금 전',
    image: post.image || post.imageUrl,
    imageUrl: post.imageUrl || post.image,
    ageTag: post.ageTag || post.generationTag || '전체',
    generationTag: post.generationTag || post.ageTag || '전체',
    categoryTag: post.categoryTag || post.category || '기타',
    title: post.title || post.content || '제목 없음',
    content: post.content || '',
    progress: Number(post.progress ?? Math.min(100, Math.round((likes / targetLikes) * 100))),
    likes,
    comments: Number(post.comments ?? post.commentCount ?? 0),
    targetLikes,
    isMine: Boolean(post.isMine ?? post.mine),
    isLiked: Boolean(post.isLiked ?? post.likedByMe),
    likedByMe: Boolean(post.likedByMe ?? post.isLiked),
  };
}

function normalizePostsResponse(payload) {
  const source = Array.isArray(payload) ? payload : payload?.posts;

  return Array.isArray(source) ? source.map(normalizePost) : [];
}

function getResidenceName(user) {
  if (typeof user?.region === 'string') {
    return user.region;
  }

  return user?.region?.fullName || user?.district || '내 동네';
}

function getResidentBadgeInfo(user) {
  const badgeStatus = user?.badgeStatus || (user?.isResidentVerified ? 'active' : 'inactive');
  const verifyCount = Number(user?.verifyCount ?? 0);

  if (badgeStatus === 'active') {
    return {
      isActive: true,
      isPressable: false,
      label: '거주자 ✓',
      style: 'active',
    };
  }

  if (verifyCount > 0) {
    return {
      isActive: false,
      isPressable: true,
      label: '인증 갱신 필요',
      style: 'renewal',
    };
  }

  return {
    isActive: false,
    isPressable: true,
    label: '거주자 인증하기',
    style: 'inactive',
  };
}

function writeOngoingPick(post) {
  setMyPostProgress({
    title: post.title,
    progress: post.progress ?? 0,
    likes: post.likes ?? 0,
    targetLikes: post.targetLikes ?? TARGET_LIKES,
  });
}

function PostCard({ post, onPress, onShare, onToggleLike }) {
  const imageSource = post.imageUrl || post.image;
  const generationTag = post.generationTag || post.ageTag || '전체';
  const isLiked = post.likedByMe ?? post.isLiked;

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

      {imageSource ? (
        <Image
          source={{ uri: imageSource }}
          style={styles.postImage}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={styles.postImagePlaceholder}>
          <Text style={styles.postImagePlaceholderText}>이미지 없음</Text>
        </View>
      )}

      <View style={styles.tagRow}>
        <View style={styles.generationTag}>
          <Text style={styles.generationTagText}>{generationTag}</Text>
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
          <Text style={[styles.actionText, isLiked && styles.likedText]}>
            {isLiked ? '♥' : '♡'} {post.likes}
          </Text>
        </TouchableOpacity>
        <Text style={styles.actionText}>댓글 {post.comments}</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={onShare}>
          <Text style={styles.shareIcon}>↗</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatRoomScreen() {
  const { accessToken, user } = useAuth();
  const navigation = useNavigation();
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);
  const refreshTimeoutRef = useRef(null);
  const [posts, setPosts] = useState(initialPosts);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedAgeTag, setSelectedAgeTag] = useState('전체');
  const [selectedCategory] = useState('기타');
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const regionName = getResidenceName(user);
  const residentBadgeInfo = getResidentBadgeInfo(user);
  const normalizedSearchText = searchText.trim().toLowerCase();
  const isMessageEmpty = !message.trim();
  const isResidentVerified = residentBadgeInfo.isActive;
  const visiblePosts = normalizedSearchText
    ? posts.filter((post) =>
        `${post.title} ${post.content} ${post.categoryTag}`
          .toLowerCase()
          .includes(normalizedSearchText),
      )
    : posts;

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const loadPosts = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setIsLoadingPosts(true);
    }

    try {
      console.log('accessToken:', accessToken ? '있음' : '없음');
      const data = await apiClient.get('/api/posts', {
        params: { region: regionName },
      });
      const nextPosts = normalizePostsResponse(data);

      if (nextPosts.length > 0) {
        setPosts(nextPosts);
      }
    } catch (error) {
      console.warn('Posts API fallback to mock data.', error?.message);
      setPosts((currentPosts) => (currentPosts.length > 0 ? currentPosts : initialPosts));
    } finally {
      setIsLoadingPosts(false);
      setRefreshing(false);
    }
  }, [accessToken, regionName]);

  useFocusEffect(
    useCallback(() => {
      void loadPosts({ showLoading: posts.length === 0 });

      const commentCounts = getPostCommentCounts();
      const likeCounts = getPostLikeCounts();

      setPosts((currentPosts) =>
        currentPosts.map((post) => {
          const nextCommentCount = commentCounts[String(post.id)];
          const nextLikeState = likeCounts[String(post.id)];

          if (nextCommentCount === undefined && nextLikeState === undefined) {
            return post;
          }

          return {
            ...post,
            ...(nextCommentCount === undefined ? {} : { comments: nextCommentCount }),
            ...(nextLikeState === undefined
              ? {}
              : {
                  likes: nextLikeState.count,
                  isLiked: nextLikeState.isLiked,
                  likedByMe: nextLikeState.isLiked,
                }),
          };
        }),
      );
    }, [loadPosts, posts.length]),
  );

  const handlePostPress = (post) => {
    navigation.navigate('PostDetail', { post });
  };

  const handleSearchPress = () => {
    setIsSearchVisible(true);
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const handleShare = async () => {
    await Share.share({
      message: '로컬픽에서 발견한 명소를 확인해보세요!',
    });
  };

  const handleToggleLike = async (postId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentPost = posts.find((post) => post.id === postId);

    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        const nextLikedByMe = !(post.likedByMe ?? post.isLiked);

        const nextLikes = post.likes + (nextLikedByMe ? 1 : -1);
        const nextPost = {
          ...post,
          likedByMe: nextLikedByMe,
          isLiked: nextLikedByMe,
          likes: nextLikes,
          progress: Math.min(
            100,
            Math.round((nextLikes / (post.targetLikes ?? TARGET_LIKES)) * 100),
          ),
        };

        if (nextPost.isMine) {
          writeOngoingPick(nextPost);
        }

        return nextPost;
      }),
    );

    try {
      console.log('accessToken:', accessToken ? '있음' : '없음');
      const likeData = await apiClient.post(`/api/posts/${postId}/like`);

      setPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          const nextLikes = Number(likeData?.likes ?? likeData?.likeCount ?? post.likes);
          const nextLiked = Boolean(likeData?.isLiked ?? likeData?.likedByMe ?? post.isLiked);

          return {
            ...post,
            likes: nextLikes,
            isLiked: nextLiked,
            likedByMe: nextLiked,
            progress: Math.min(
              100,
              Math.round((nextLikes / (post.targetLikes ?? TARGET_LIKES)) * 100),
            ),
          };
        }),
      );
    } catch (error) {
      console.warn('Post like API failed. Keeping local optimistic state.', error?.message);

      if (!currentPost) {
        return;
      }
    }
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('권한 필요', '이미지를 첨부하려면 사진 접근 권한이 필요해요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelectedImageUri(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    if (!isResidentVerified) {
      Alert.alert(
        '거주자 인증이 필요해요',
        'GPS 위치 확인을 완료하면 소통방에 글을 작성할 수 있어요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '인증하기',
            onPress: () => navigation.navigate('ResidentVerification'),
          },
        ],
      );
      return;
    }

    if (isMessageEmpty) {
      Alert.alert('내용을 입력해주세요', '명소 소개 글을 작성해주세요.');
      return;
    }

    const inputText = message.trim();
    const requestBody = {
      title: inputText,
      content: inputText,
      ageTag: selectedAgeTag || '전체',
      categoryTag: selectedCategory || '기타',
      region: regionName,
      image: selectedImageUri,
    };
    const fallbackPost = {
      id: Date.now(),
      author: user?.nickname || '나',
      isResident: true,
      time: '방금 전',
      image: selectedImageUri,
      imageUrl: selectedImageUri,
      ageTag: selectedAgeTag || '전체',
      generationTag: selectedAgeTag || '전체',
      categoryTag: selectedCategory || '기타',
      title: inputText,
      content: inputText,
      progress: 0,
      likes: 0,
      comments: 0,
      targetLikes: TARGET_LIKES,
      isMine: true,
      isLiked: false,
      likedByMe: false,
    };

    try {
      console.log('accessToken:', accessToken ? '있음' : '없음');
      const data = await apiClient.post('/api/posts', requestBody);
      const newPost = normalizePost(data?.post || data);

      setPosts((currentPosts) => [newPost, ...currentPosts]);
      writeOngoingPick(newPost);
      setMessage('');
      setSelectedImageUri(null);
      await loadPosts();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.warn('Create post API fallback to local post.', error?.message);
      setPosts((currentPosts) => [fallbackPost, ...currentPosts]);
      writeOngoingPick(fallbackPost);
      setMessage('');
      setSelectedImageUri(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleFocusComposer = () => {
    inputRef.current?.focus();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    void loadPosts();
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
            <Text style={styles.title}>{regionName} 소통방</Text>
            <TouchableOpacity
              style={[
                styles.headerResidentBadge,
                residentBadgeInfo.style === 'active' && styles.activeHeaderResidentBadge,
                residentBadgeInfo.style === 'inactive' && styles.inactiveHeaderResidentBadge,
                residentBadgeInfo.style === 'renewal' && styles.renewalHeaderResidentBadge,
              ]}
              activeOpacity={residentBadgeInfo.isPressable ? 0.7 : 1}
              disabled={!residentBadgeInfo.isPressable}
              onPress={() => navigation.navigate('ResidentVerification')}
            >
              <Text
                style={[
                  styles.headerResidentBadgeText,
                  residentBadgeInfo.style === 'active' && styles.activeHeaderResidentBadgeText,
                  residentBadgeInfo.style === 'inactive' && styles.inactiveHeaderResidentBadgeText,
                  residentBadgeInfo.style === 'renewal' && styles.renewalHeaderResidentBadgeText,
                ]}
              >
                {residentBadgeInfo.label}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={handleSearchPress}>
              <Text style={styles.iconButtonText}>⌕</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, styles.disabledIconButton]} disabled>
              <Text style={styles.iconButtonText}>⋯</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isSearchVisible && (
          <View style={styles.searchBar}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="게시글 검색"
              placeholderTextColor="#9B9F98"
            />
            <TouchableOpacity
              style={styles.searchCloseButton}
              activeOpacity={0.7}
              onPress={() => {
                setSearchText('');
                setIsSearchVisible(false);
              }}
            >
              <Text style={styles.searchCloseText}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          bounces
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.feedContent,
            visiblePosts.length === 0 && styles.emptyFeedContent,
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
          {isLoadingPosts ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={MAIN_GREEN} />
            </View>
          ) : visiblePosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>
                {normalizedSearchText ? '검색 결과가 없어요' : '아직 등록된 명소가 없어요'}
              </Text>
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
            visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPress={() => handlePostPress(post)}
                onShare={handleShare}
                onToggleLike={() => handleToggleLike(post.id)}
              />
            ))
          )}
        </ScrollView>

        <View style={styles.composer}>
          <View style={styles.ageTagRow}>
            {AGE_TAGS.map((ageTag) => {
              const isSelected = selectedAgeTag === ageTag;

              return (
                <TouchableOpacity
                  key={ageTag}
                  style={[styles.ageTagButton, isSelected && styles.selectedAgeTagButton]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedAgeTag(ageTag)}
                >
                  <Text style={[styles.ageTagText, isSelected && styles.selectedAgeTagText]}>
                    {ageTag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedImageUri && (
            <View style={styles.imagePreviewWrap}>
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.imagePreview}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                activeOpacity={0.7}
                onPress={() => setSelectedImageUri(null)}
              >
                <Text style={styles.removeImageButtonText}>×</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.composerInputRow}>
            <TouchableOpacity
              style={styles.attachButton}
              activeOpacity={0.7}
              onPress={handlePickImage}
            >
              <Ionicons name="camera-outline" size={24} color={MAIN_GREEN} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="내 동네 명소를 공유해보세요..."
              placeholderTextColor="#9B9F98"
            />
            <TouchableOpacity
              style={[styles.sendButton, isMessageEmpty && isResidentVerified && styles.disabledSendButton]}
              activeOpacity={0.7}
              disabled={isMessageEmpty && isResidentVerified}
              onPress={handleSend}
            >
              <Text style={styles.sendButtonText}>↑</Text>
            </TouchableOpacity>
          </View>
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
  headerResidentBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeHeaderResidentBadge: {
    backgroundColor: '#E7EFE9',
  },
  inactiveHeaderResidentBadge: {
    backgroundColor: '#ECEDEE',
  },
  renewalHeaderResidentBadge: {
    backgroundColor: '#F8E7D0',
  },
  headerResidentBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  activeHeaderResidentBadgeText: {
    color: MAIN_GREEN,
  },
  inactiveHeaderResidentBadgeText: {
    color: GRAY,
  },
  renewalHeaderResidentBadgeText: {
    color: ORANGE,
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
  disabledIconButton: {
    opacity: 0.3,
  },
  searchBar: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    marginHorizontal: 20,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: TEXT_PRIMARY,
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  searchCloseButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  searchCloseText: {
    color: TEXT_SECONDARY,
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
  postImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 150,
    justifyContent: 'center',
    marginTop: 14,
  },
  postImagePlaceholderText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '900',
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
  loadingState: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 8,
    minHeight: 180,
    justifyContent: 'center',
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
    backgroundColor: CARD,
    borderTopColor: BORDER,
    borderTopWidth: 1,
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  ageTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ageTagButton: {
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    borderColor: BORDER,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    height: 34,
    justifyContent: 'center',
  },
  selectedAgeTagButton: {
    backgroundColor: MAIN_GREEN,
    borderColor: MAIN_GREEN,
  },
  ageTagText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedAgeTagText: {
    color: CARD,
  },
  composerInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  imagePreviewWrap: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  imagePreview: {
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 76,
    width: 102,
  },
  removeImageButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: -7,
    top: -7,
    width: 22,
  },
  removeImageButtonText: {
    color: CARD,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  attachButton: {
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
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
    backgroundColor: '#CCCCCC',
  },
  sendButtonText: {
    color: CARD,
    fontSize: 21,
    fontWeight: '900',
  },
});
