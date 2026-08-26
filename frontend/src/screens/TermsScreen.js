import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#F8F6F1';
const MAIN_GREEN = '#2D5C44';
const BODY_TEXT = '#4A6358';
const DIVIDER = '#F0F0F0';

const sections = [
  {
    title: '1. 서비스 소개',
    body: '로컬픽은 거주자가 발굴한 로컬 명소를 공유하는 앱입니다.',
  },
  {
    title: '2. 이용자 의무',
    body: '타인을 비방하거나 허위 정보를 게시하지 않아야 합니다.\n거주자 인증 시 실제 거주 지역을 정확히 입력해야 합니다.',
  },
  {
    title: '3. 콘텐츠 저작권',
    body: '이용자가 작성한 게시물의 저작권은 이용자에게 있습니다.',
  },
  {
    title: '4. 서비스 중단',
    body: '시스템 점검, 천재지변 등의 사유로 서비스가 중단될 수 있습니다.',
  },
  {
    title: '5. 면책조항',
    body: '로컬픽은 이용자가 게시한 정보의 정확성을 보증하지 않습니다.',
  },
];

export default function TermsScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>이용약관</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
            {index < sections.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
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
    paddingBottom: 40,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  section: {
    paddingVertical: 18,
  },
  sectionTitle: {
    color: MAIN_GREEN,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionBody: {
    color: BODY_TEXT,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  divider: {
    backgroundColor: DIVIDER,
    height: 1,
    marginTop: 18,
  },
});
