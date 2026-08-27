import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND = '#F8F6F1';
const MAIN_GREEN = '#2D5C44';
const BODY_TEXT = '#4A6358';
const DIVIDER = '#F0F0F0';

const sections = [
  {
    title: '1. 수집하는 개인정보 항목',
    body: '카카오 로그인을 통한 닉네임, 프로필 사진\n서비스 이용 중 생성되는 게시물, 위치 정보(행정구역 텍스트)',
  },
  {
    title: '2. 개인정보 수집 및 이용 목적',
    body: '서비스 이용자 식별, 거주자 인증, 서비스 제공',
  },
  {
    title: '3. 개인정보 보유 및 이용 기간',
    body: '회원 탈퇴 시까지 보유, 탈퇴 후 즉시 파기',
  },
  {
    title: '4. 개인정보 제3자 제공',
    body: '제3자에게 제공하지 않음',
  },
  {
    title: '5. 문의',
    body: '이메일: localpick.official@gmail.com',
  },
];

export default function PrivacyPolicyScreen({ navigation }) {
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
        <Text style={styles.headerTitle}>개인정보처리방침</Text>
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
