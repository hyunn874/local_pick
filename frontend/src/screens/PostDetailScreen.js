import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';

export default function PostDetailScreen({ navigation, route }) {
  const post = route.params?.post;

  return (
    <SafeAreaView style={styles.safeArea}>
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
        <Text style={styles.headerTitle}>게시글 상세</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {post ? (
          <View style={styles.detailCard}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <Text style={styles.postMeta}>{post.author} · {post.time}</Text>
            <Text style={styles.postContent}>{post.content}</Text>
            <View style={styles.likeBadge}>
              <Text style={styles.likeText}>좋아요 {post.likes}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyText}>게시글을 찾을 수 없어요</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BACKGROUND,
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
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 18,
  },
  postTitle: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 29,
  },
  postMeta: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  postContent: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
    marginTop: 20,
  },
  likeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E7EFE9',
    borderRadius: 999,
    marginTop: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  likeText: {
    color: MAIN_GREEN,
    fontSize: 14,
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
