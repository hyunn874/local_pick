import { useCallback, useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import LocalPickModal from '../components/LocalPickModal';
import { useAuth } from '../contexts/AuthContext';
import { getPostCommentCounts } from '../state/postCommentCounts';
import { getPostLikeCounts } from '../state/postLikeCounts';
import { setMyPostProgress } from '../state/myPostProgress';
import REGION_COORDINATES from '../data/regionCoordinates';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const ORANGE = '#D88A24';
const GRAY = '#8A918A';
const TARGET_LIKES = 30;
const AGE_FILTERS = ['전체', '20대', '30-40대', '50대+'];
const PLACE_CATEGORIES = ['음식점', '카페', '산책', '문화', '자연', '기타'];
const INITIAL_PLACE_FORM = {
  category: '음식점',
  placeName: '',
  title: '',
  address: '',
  description: '',
};

function normalizeGenerationLabel(value) {
  if (value === 'TWENTIES' || value === '20대') {
    return '20대';
  }

  if (value === 'THIRTIES_FORTIES' || value === '30·40대' || value === '30-40대') {
    return '30-40대';
  }

  if (value === 'FIFTIES_PLUS' || value === '50대 이상' || value === '50대+') {
    return '50대+';
  }

  return '전체';
}

function calculateAdoptionProgress({
  likes = 0,
  comments = 0,
  shares = 0,
  likeThreshold = 30,
  commentThreshold = 10,
  shareThreshold = 5,
}) {
  const likeRatio = Math.min(1, Number(likes) / likeThreshold);
  const commentRatio = Math.min(1, Number(comments) / commentThreshold);
  const shareRatio = Math.min(1, Number(shares) / shareThreshold);

  return Math.round(((likeRatio + commentRatio + shareRatio) / 3) * 100);
}

function normalizePost(post) {
  const likes = Number(post.likes ?? post.likeCount ?? 0);
  const comments = Number(post.comments ?? post.commentCount ?? 0);
  const shares = Number(post.shares ?? post.shareCount ?? 0);
  const adoptionCount = Number(post.adoptionCount ?? 0);
  const likeThreshold = Number(post.adoptionLikeThreshold ?? post.targetLikes ?? TARGET_LIKES);
  const commentThreshold = Number(post.adoptionCommentThreshold ?? 10);
  const shareThreshold = Number(post.adoptionShareThreshold ?? 5);
  const progress = calculateAdoptionProgress({
    likes,
    comments,
    shares,
    likeThreshold,
    commentThreshold,
    shareThreshold,
  });
  const content = post.content || '';
  const categoryFromContent = content.match(/\[장소유형\]\s*([^\n]+)/)?.[1]?.trim();
  const ageGroup = normalizeGenerationLabel(
    post.authorAgeGroup || post.ageGroup || post.ageTag || post.generationTag,
  );

  return {
    id: post.id ?? post.postId,
    author: post.author?.nickname || post.authorNickname || post.authorName || post.author || '로컬픽 사용자',
    authorId: post.authorId,
    isResident: Boolean(post.isResident ?? post.writtenByResident ?? post.author?.isResidentVerified),
    time: post.time || post.createdAt || '방금 전',
    image: post.image || post.imageUrl || post.imageUrls?.[0],
    imageUrl: post.imageUrl || post.image || post.imageUrls?.[0],
    ageTag: ageGroup,
    authorAgeGroup: ageGroup,
    generationTag: ageGroup,
    categoryTag: post.categoryTag || post.category || categoryFromContent || '기타',
    title: post.title || post.content || '제목 없음',
    content,
    progress: Number(post.progress ?? progress),
    likes,
    comments,
    shares,
    adoptionCount,
    isAdopted: Boolean(post.isAdopted ?? post.adopted),
    regionCode: post.regionCode,
    regionName: post.regionName,
    targetLikes: likeThreshold,
    adoptionLikeThreshold: likeThreshold,
    adoptionCommentThreshold: commentThreshold,
    adoptionShareThreshold: shareThreshold,
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

function getUserRegion(user) {
  if (user?.region && typeof user.region === 'object') {
    return user.region;
  }

  return null;
}

function getUserRegionCode(user) {
  return user?.regionCode || user?.region?.regionCode || user?.region?.code || '';
}

function getRegionCenter(region) {
  const centerLatitude = Number(region?.centerLatitude);
  const centerLongitude = Number(region?.centerLongitude);

  if (Number.isFinite(centerLatitude) && Number.isFinite(centerLongitude)) {
    return {
      latitude: centerLatitude,
      longitude: centerLongitude,
    };
  }

  return REGION_COORDINATES[region?.regionCode || region?.code] || null;
}

function buildPostTitle(text) {
  return text.length > 50 ? `${text.slice(0, 47)}...` : text;
}

function getPlaceSubmitErrorMessage(error) {
  if (error?.code === 'P003' || error?.status === 403) {
    return '현재 인증된 거주 지역과 명소 등록 지역이 맞는지 확인해주세요.';
  }

  if (error?.code === 'C001' || error?.status === 400) {
    return error?.message || '입력한 명소 정보를 다시 확인해주세요.';
  }

  return error?.message || '잠시 후 다시 시도해주세요.';
}

function inferImageType(uri) {
  const extension = String(uri || '').split('?')[0].split('.').pop()?.toLowerCase();

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  if (extension === 'heic') {
    return 'image/heic';
  }

  if (extension === 'heif') {
    return 'image/heif';
  }

  return 'image/jpeg';
}

async function uploadPlaceImage(uri) {
  if (!uri) {
    return null;
  }

  const formData = new FormData();
  const fileType = inferImageType(uri);
  const extension = fileType.split('/')[1] || 'jpg';

  formData.append('file', {
    uri,
    name: `localpick-place-${Date.now()}.${extension === 'jpeg' ? 'jpg' : extension}`,
    type: fileType,
  });

  const data = await apiClient.post('/api/images/upload', formData, {
    timeoutMs: 90000,
  });

  return data?.imageUrl || data?.url || null;
}

function getResidentBadgeInfo(user) {
  const badgeStatus = user?.badgeStatus || (user?.isResidentVerified ? 'active' : 'inactive');
  const verifyCount = Number(user?.verifyCount ?? 0);
  const hasAccess = Boolean(user?.isResidentVerified);

  if (badgeStatus === 'active') {
    return {
      isActive: true,
      hasAccess: true,
      isPressable: false,
      label: '거주자 ✓',
      style: 'active',
    };
  }

  if (verifyCount > 0) {
    return {
      isActive: false,
      hasAccess,
      isPressable: true,
      label: hasAccess ? '2차 인증 필요' : 'GPS 인증 필요',
      style: 'renewal',
    };
  }

  return {
    isActive: false,
    hasAccess: false,
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

function MessageBubble({ item }) {
  return (
    <View style={styles.messageBubble}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageAuthor}>{item.author}</Text>
        <Text style={styles.messageTime}>{item.time}</Text>
      </View>
      <Text style={styles.messageText}>{item.text}</Text>
    </View>
  );
}

function PostCard({ post, onPress, onShare, onToggleLike, onAdopt }) {
  const imageSource = post.imageUrl || post.image;
  const generationTag = post.authorAgeGroup || post.generationTag || post.ageTag || '전체';
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
            <View style={styles.authorAgeBadge}>
              <Text style={styles.authorAgeBadgeText}>{generationTag}</Text>
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
        <TouchableOpacity activeOpacity={0.7} onPress={onAdopt}>
          <Text style={styles.actionText}>{post.isAdopted ? '채택됨' : '채택하기'}</Text>
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
  const [posts, setPosts] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [message, setMessage] = useState('');
  const [placeImageUri, setPlaceImageUri] = useState(null);
  const [isPlaceFormVisible, setIsPlaceFormVisible] = useState(false);
  const [placeForm, setPlaceForm] = useState(INITIAL_PLACE_FORM);
  const [isSubmittingPlace, setIsSubmittingPlace] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedAgeFilter, setSelectedAgeFilter] = useState('전체');
  const [authModalConfig, setAuthModalConfig] = useState({
    visible: false,
    message: '',
  });
  const userRegion = getUserRegion(user);
  const regionName = getResidenceName(user);
  const regionCode = getUserRegionCode(user);
  const regionCenter = getRegionCenter(userRegion);
  const residentBadgeInfo = getResidentBadgeInfo(user);
  const normalizedSearchText = searchText.trim().toLowerCase();
  const isMessageEmpty = !message.trim();
  const isResidentVerified = residentBadgeInfo.hasAccess;
  const visiblePosts = posts.filter((post) => {
    const matchesAge =
      selectedAgeFilter === '전체' || normalizeGenerationLabel(post.authorAgeGroup || post.generationTag) === selectedAgeFilter;
    const matchesSearch =
      !normalizedSearchText ||
      `${post.title} ${post.content} ${post.categoryTag}`
        .toLowerCase()
        .includes(normalizedSearchText);

    return matchesAge && matchesSearch;
  });
  const visibleChatMessages = selectedAgeFilter === '전체' ? chatMessages : [];
  const hasFeedItems = visibleChatMessages.length > 0 || visiblePosts.length > 0;
  const closeAuthModal = () => {
    setAuthModalConfig((currentConfig) => ({
      ...currentConfig,
      visible: false,
    }));
  };
  const showResidentRequiredModal = (messageText) => {
    setAuthModalConfig({
      visible: true,
      message: messageText,
    });
  };
  const navigateToResidentVerification = () => {
    closeAuthModal();
    navigation.navigate('ResidentVerification');
  };

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const loadPosts = useCallback(async ({ showLoading = false } = {}) => {
    if (!accessToken || !regionCode || !isResidentVerified) {
      setPosts([]);
      setRefreshing(false);
      setIsLoadingPosts(false);
      return;
    }

    if (showLoading) {
      setIsLoadingPosts(true);
    }

    try {
      const data = await apiClient.get('/api/posts', {
        params: { region: regionCode },
      });
      const nextPosts = normalizePostsResponse(data);

      setPosts(nextPosts);
    } catch (error) {
      setPosts([]);
    } finally {
      setIsLoadingPosts(false);
      setRefreshing(false);
    }
  }, [accessToken, isResidentVerified, regionCode]);

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

  const handleShare = async (post) => {
    try {
      try {
        await Linking.canOpenURL('kakaotalk://');
      } catch {
        // 기본 공유 시트는 카카오톡 scheme 확인 실패와 무관하게 열 수 있다.
      }

      const shareContent = {
        title: `로컬픽 - ${post.title}`,
        message: `로컬픽에서 발견한 숨은 명소!\n\n📍 ${post.title}\n${post.content}\n\n로컬픽에서 더 많은 명소를 발견해보세요!`,
      };
      const result = await Share.share(shareContent);

      if (result.action === Share.sharedAction) {
        const shareData = await apiClient.post(`/api/posts/${post.id}/share`);
        setPosts((currentPosts) =>
          currentPosts.map((currentPost) => {
            if (currentPost.id !== post.id) {
              return currentPost;
            }

            const nextShares = Number(shareData?.shareCount ?? currentPost.shares + 1);
            const nextProgress = calculateAdoptionProgress({
              likes: currentPost.likes,
              comments: currentPost.comments,
              shares: nextShares,
              likeThreshold: currentPost.adoptionLikeThreshold,
              commentThreshold: currentPost.adoptionCommentThreshold,
              shareThreshold: currentPost.adoptionShareThreshold,
            });

            return {
              ...currentPost,
              shares: nextShares,
              progress: nextProgress,
              isAdopted: Boolean(shareData?.adopted ?? shareData?.isAdopted ?? currentPost.isAdopted),
            };
          }),
        );
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert('공유 실패', '공유하기를 다시 시도해주세요.');
    }
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
        const nextProgress = calculateAdoptionProgress({
          likes: nextLikes,
          comments: post.comments,
          shares: post.shares,
          likeThreshold: post.adoptionLikeThreshold,
          commentThreshold: post.adoptionCommentThreshold,
          shareThreshold: post.adoptionShareThreshold,
        });
        const nextPost = {
          ...post,
          likedByMe: nextLikedByMe,
          isLiked: nextLikedByMe,
          likes: nextLikes,
          progress: nextProgress,
        };

        if (nextPost.isMine) {
          writeOngoingPick(nextPost);
        }

        return nextPost;
      }),
    );

    try {
      const likeData = await apiClient.post(`/api/posts/${postId}/like`);

      setPosts((currentPosts) =>
        currentPosts.map((post) => {
          if (post.id !== postId) {
            return post;
          }

          const nextLikes = Number(likeData?.likeCount ?? likeData?.likes ?? post.likes);
          const nextLiked = Boolean(likeData?.liked ?? likeData?.isLiked ?? likeData?.likedByMe ?? post.isLiked);
          const nextProgress = calculateAdoptionProgress({
            likes: nextLikes,
            comments: post.comments,
            shares: post.shares,
            likeThreshold: post.adoptionLikeThreshold,
            commentThreshold: post.adoptionCommentThreshold,
            shareThreshold: post.adoptionShareThreshold,
          });

          return {
            ...post,
            likes: nextLikes,
            isLiked: nextLiked,
            likedByMe: nextLiked,
            progress: nextProgress,
          };
        }),
      );
    } catch (error) {
      if (!currentPost) {
        return;
      }
    }
  };

  const handleAdopt = async (post) => {
    if (!isResidentVerified) {
      showResidentRequiredModal('채택 투표는 거주자 인증 후 참여할 수 있어요.');
      return;
    }

    if (!post?.id || post.isAdopted) {
      return;
    }

    try {
      const data = await apiClient.post(`/api/posts/${post.id}/adopt`);
      setPosts((currentPosts) =>
        currentPosts.map((currentPost) => {
          if (currentPost.id !== post.id) {
            return currentPost;
          }

          const nextAdoptionCount = Number(data?.adoptionCount ?? currentPost.adoptionCount + 1);

          return {
            ...currentPost,
            adoptionCount: nextAdoptionCount,
            isAdopted: Boolean(data?.adopted ?? data?.isAdopted ?? currentPost.isAdopted),
          };
        }),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('채택 투표 실패', '잠시 후 다시 시도해주세요.');
    }
  };

  const handlePickPlaceImage = async () => {
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
      setPlaceImageUri(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    if (!isResidentVerified) {
      showResidentRequiredModal('GPS 위치 확인을 완료하면 소통방에 글을 작성할 수 있어요.');
      return;
    }

    if (isMessageEmpty) {
      Alert.alert('내용을 입력해주세요', '소통방에 남길 메시지를 입력해주세요.');
      return;
    }

    const inputText = message.trim();
    setChatMessages((currentMessages) => [
      {
        id: `chat-${Date.now()}`,
        author: user?.nickname || '나',
        text: inputText,
        time: '방금 전',
      },
      ...currentMessages,
    ]);
    setMessage('');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const updatePlaceForm = (key, value) => {
    setPlaceForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const openPlaceForm = () => {
    if (!isResidentVerified) {
      navigation.navigate('ResidentVerification');
      return;
    }

    setIsPlaceFormVisible(true);
  };

  const closePlaceForm = () => {
    setIsPlaceFormVisible(false);
  };

  const resetPlaceForm = () => {
    setPlaceForm(INITIAL_PLACE_FORM);
    setPlaceImageUri(null);
  };

  const handleSubmitPlace = async () => {
    if (!isResidentVerified) {
      showResidentRequiredModal('GPS 위치 확인 후 명소를 등록할 수 있어요.');
      return;
    }

    if (!regionCode || !regionCenter) {
      Alert.alert('지역 정보가 필요해요', '거주 지역 정보를 다시 불러온 뒤 시도해주세요.');
      return;
    }

    if (!placeForm.placeName.trim() || !placeForm.address.trim() || !placeForm.description.trim()) {
      Alert.alert('필수 입력 확인', '장소명, 위치/주소, 추천 이유를 모두 입력해주세요.');
      return;
    }

    setIsSubmittingPlace(true);

    try {
      const uploadedImageUrl = placeImageUri ? await uploadPlaceImage(placeImageUri) : null;
      const title = placeForm.title.trim() || placeForm.placeName.trim();
      const requestBody = {
        title: buildPostTitle(title),
        content: [
          `[장소유형] ${placeForm.category}`,
          `[위치/주소] ${placeForm.address.trim()}`,
          `[추천 이유] ${placeForm.description.trim()}`,
        ].join('\n'),
        placeName: placeForm.placeName.trim(),
        regionCode,
        latitude: regionCenter.latitude,
        longitude: regionCenter.longitude,
        imageUrls: uploadedImageUrl ? [uploadedImageUrl] : [],
      };
      const data = await apiClient.post('/api/posts', requestBody);
      const newPost = normalizePost(data?.post || data);

      setPosts((currentPosts) => [newPost, ...currentPosts]);
      writeOngoingPick(newPost);
      resetPlaceForm();
      closePlaceForm();
      await loadPosts();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('등록 실패', getPlaceSubmitErrorMessage(error));
    } finally {
      setIsSubmittingPlace(false);
    }
  };

  const handleFocusComposer = () => {
    if (!isResidentVerified) {
      navigation.navigate('ResidentVerification');
      return;
    }

    inputRef.current?.focus();
  };

  const handleRefresh = () => {
    setRefreshing(true);
    void loadPosts();
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
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

        <View style={styles.ageFilterRow}>
          {AGE_FILTERS.map((filter) => {
            const isSelected = selectedAgeFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[styles.ageFilterButton, isSelected && styles.selectedAgeFilterButton]}
                activeOpacity={0.7}
                onPress={() => setSelectedAgeFilter(filter)}
              >
                <Text
                  style={[styles.ageFilterText, isSelected && styles.selectedAgeFilterText]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          bounces
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.feedContent,
            !hasFeedItems && styles.emptyFeedContent,
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
              <Text style={styles.loadingText}>동네 명소를 불러오고 있어요...</Text>
            </View>
          ) : !hasFeedItems ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyTitle}>
                {!isResidentVerified
                  ? '거주자 인증이 필요해요'
                  : normalizedSearchText
                    ? '검색 결과가 없어요'
                    : '아직 공유된 명소가 없어요'}
              </Text>
              <Text style={styles.emptyDescription}>
                {!isResidentVerified
                  ? '인증을 완료하면 내 거주 지역 소통방의 실제 게시글만 볼 수 있어요.'
                  : normalizedSearchText
                  ? '다른 검색어로 다시 찾아보세요.'
                  : '우리 동네 숨은 명소를 첫 번째로 공유해보세요!'}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                activeOpacity={0.7}
                onPress={isResidentVerified ? openPlaceForm : handleFocusComposer}
              >
                <Text style={styles.emptyButtonText}>
                  {isResidentVerified ? '명소 등록하기' : '거주자 인증하기'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {visibleChatMessages.map((chatMessage) => (
                <MessageBubble key={chatMessage.id} item={chatMessage} />
              ))}
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPress={() => handlePostPress(post)}
                  onShare={() => handleShare(post)}
                  onToggleLike={() => handleToggleLike(post.id)}
                  onAdopt={() => handleAdopt(post)}
                />
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.composer}>
          <TouchableOpacity
            style={[styles.templateButton, !isResidentVerified && styles.disabledTemplateButton]}
            activeOpacity={0.7}
            onPress={openPlaceForm}
          >
            <Ionicons name="location-outline" size={17} color={isResidentVerified ? MAIN_GREEN : GRAY} />
            <Text style={[styles.templateButtonText, !isResidentVerified && styles.disabledTemplateButtonText]}>
              명소 등록 템플릿
            </Text>
          </TouchableOpacity>
          <View style={styles.composerInputRow}>
            <TouchableOpacity
              style={[styles.attachButton, !isResidentVerified && styles.disabledAttachButton]}
              activeOpacity={0.7}
              onPress={openPlaceForm}
            >
              <Ionicons name="add-outline" size={25} color={isResidentVerified ? MAIN_GREEN : GRAY} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              editable={isResidentVerified}
              placeholder={isResidentVerified ? '동네 이야기를 나눠보세요...' : '거주자 인증 후 참여할 수 있어요'}
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

        <Modal
          visible={isPlaceFormVisible}
          animationType="slide"
          transparent
          onRequestClose={closePlaceForm}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              style={styles.placeFormKeyboardAvoidingView}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <View style={styles.placeFormModal}>
                <View style={styles.placeFormHeader}>
                  <Text style={styles.placeFormTitle}>명소 등록</Text>
                  <TouchableOpacity
                    style={styles.placeFormCloseButton}
                    activeOpacity={0.7}
                    onPress={closePlaceForm}
                  >
                    <Text style={styles.placeFormCloseText}>×</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.formLabel}>장소 유형</Text>
                  <View style={styles.categorySelectRow}>
                    {PLACE_CATEGORIES.map((category) => {
                      const isSelected = placeForm.category === category;

                      return (
                        <TouchableOpacity
                          key={category}
                          style={[styles.categorySelectButton, isSelected && styles.selectedCategorySelectButton]}
                          activeOpacity={0.7}
                          onPress={() => updatePlaceForm('category', category)}
                        >
                          <Text
                            style={[
                              styles.categorySelectText,
                              isSelected && styles.selectedCategorySelectText,
                            ]}
                          >
                            {category}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.formLabel}>장소명 *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={placeForm.placeName}
                    onChangeText={(value) => updatePlaceForm('placeName', value)}
                    placeholder="예: 동네 산책로 전망대"
                    placeholderTextColor="#9B9F98"
                  />

                  <Text style={styles.formLabel}>게시글 제목</Text>
                  <TextInput
                    style={styles.formInput}
                    value={placeForm.title}
                    onChangeText={(value) => updatePlaceForm('title', value)}
                    placeholder="예: 저녁 노을이 예쁜 산책 명소"
                    placeholderTextColor="#9B9F98"
                  />

                  <Text style={styles.formLabel}>위치/주소 *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={placeForm.address}
                    onChangeText={(value) => updatePlaceForm('address', value)}
                    placeholder="도로명 또는 동네 기준 위치"
                    placeholderTextColor="#9B9F98"
                  />

                  <Text style={styles.formLabel}>추천 이유 *</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextarea]}
                    value={placeForm.description}
                    onChangeText={(value) => updatePlaceForm('description', value)}
                    placeholder="현지인이 알면 좋은 메뉴, 시간대, 분위기 등을 적어주세요"
                    placeholderTextColor="#9B9F98"
                    multiline
                    textAlignVertical="top"
                  />

                  {placeImageUri ? (
                    <View style={styles.placeImagePreviewWrap}>
                      <Image
                        source={{ uri: placeImageUri }}
                        style={styles.placeImagePreview}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        activeOpacity={0.7}
                        onPress={() => setPlaceImageUri(null)}
                      >
                        <Text style={styles.removeImageButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.imagePickButton}
                      activeOpacity={0.7}
                      onPress={handlePickPlaceImage}
                    >
                      <Ionicons name="camera-outline" size={18} color={MAIN_GREEN} />
                      <Text style={styles.imagePickButtonText}>사진 첨부</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.submitPlaceButton,
                      isSubmittingPlace && styles.disabledSubmitPlaceButton,
                    ]}
                    activeOpacity={0.7}
                    disabled={isSubmittingPlace}
                    onPress={handleSubmitPlace}
                  >
                    {isSubmittingPlace ? (
                      <ActivityIndicator color={CARD} />
                    ) : (
                      <Text style={styles.submitPlaceButtonText}>명소 등록하기</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
        </SafeAreaView>
      </KeyboardAvoidingView>
      <LocalPickModal
        visible={authModalConfig.visible}
        tone="warning"
        title="거주자 인증이 필요해요"
        message={authModalConfig.message}
        primaryText="인증하기"
        secondaryText="취소"
        onPrimaryPress={navigateToResidentVerification}
        onSecondaryPress={closeAuthModal}
        onRequestClose={closeAuthModal}
      />
    </>
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
  ageFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  ageFilterButton: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  selectedAgeFilterButton: {
    backgroundColor: MAIN_GREEN,
    borderColor: MAIN_GREEN,
  },
  ageFilterText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedAgeFilterText: {
    color: CARD,
  },
  feedContent: {
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  messageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#E7EFE9',
    borderRadius: 8,
    maxWidth: '86%',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  messageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  messageAuthor: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  messageTime: {
    color: '#7A9B8A',
    fontSize: 11,
    fontWeight: '700',
  },
  messageText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
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
  authorAgeBadge: {
    backgroundColor: '#EEF3FA',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  authorAgeBadgeText: {
    color: '#2F80ED',
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
    gap: 12,
    minHeight: 180,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#7A9B8A',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 44,
  },
  emptyTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyDescription: {
    color: '#7A9B8A',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
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
    paddingTop: 10,
    paddingBottom: 10,
  },
  templateButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  disabledTemplateButton: {
    backgroundColor: '#ECEDEE',
  },
  templateButtonText: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
  },
  disabledTemplateButtonText: {
    color: GRAY,
  },
  placeFormKeyboardAvoidingView: {
    width: '100%',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  placeFormModal: {
    backgroundColor: CARD,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '92%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  placeFormHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  placeFormTitle: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '900',
  },
  placeFormCloseButton: {
    alignItems: 'center',
    backgroundColor: BACKGROUND,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  placeFormCloseText: {
    color: TEXT_SECONDARY,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 26,
  },
  formLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 7,
    marginTop: 12,
  },
  categorySelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categorySelectButton: {
    backgroundColor: BACKGROUND,
    borderColor: BORDER,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedCategorySelectButton: {
    backgroundColor: MAIN_GREEN,
    borderColor: MAIN_GREEN,
  },
  categorySelectText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedCategorySelectText: {
    color: CARD,
  },
  formInput: {
    backgroundColor: BACKGROUND,
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  formTextarea: {
    minHeight: 104,
  },
  placeImagePreviewWrap: {
    alignSelf: 'flex-start',
    marginTop: 14,
    position: 'relative',
  },
  placeImagePreview: {
    backgroundColor: '#E8F0EB',
    borderRadius: 8,
    height: 92,
    width: 124,
  },
  imagePickButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  imagePickButtonText: {
    color: MAIN_GREEN,
    fontSize: 13,
    fontWeight: '900',
  },
  submitPlaceButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 18,
  },
  disabledSubmitPlaceButton: {
    opacity: 0.7,
  },
  submitPlaceButtonText: {
    color: CARD,
    fontSize: 15,
    fontWeight: '900',
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
  disabledAttachButton: {
    opacity: 0.45,
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
