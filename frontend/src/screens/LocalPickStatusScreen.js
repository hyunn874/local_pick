import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';

function getRegionName(user) {
  if (typeof user?.region === 'string') {
    return user.region;
  }

  return user?.region?.fullName || user?.district || '내 지역';
}

export default function LocalPickStatusScreen({ navigation }) {
  const { user } = useAuth();
  const isResidentVerified = Boolean(user?.isResidentVerified);

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
        <Text style={styles.headerTitle}>로컬픽 현황</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{getRegionName(user)}</Text>
          <Text style={styles.title}>지역 데이터 현황을 준비 중이에요</Text>
          <Text style={styles.description}>
            채택 명소, 참여 주민, 로컬패스 사용 흐름을 실제 데이터 기준으로 보여줄 예정이에요.
          </Text>
        </View>

        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <Text style={styles.statusValue}>0</Text>
            <Text style={styles.statusLabel}>오늘 채택 명소</Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusValue}>{isResidentVerified ? '1' : '0'}</Text>
            <Text style={styles.statusLabel}>내 인증 상태</Text>
          </View>
          <View style={styles.statusCard}>
            <Text style={styles.statusValue}>준비중</Text>
            <Text style={styles.statusLabel}>예측 지표</Text>
          </View>
        </View>
      </View>
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
    padding: 20,
  },
  heroCard: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 16,
    padding: 22,
  },
  eyebrow: {
    color: '#BFE0CD',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 12,
  },
  title: {
    color: CARD,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
  },
  description: {
    color: '#E7EFE9',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 14,
  },
  statusGrid: {
    gap: 12,
    marginTop: 18,
  },
  statusCard: {
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
  },
  statusValue: {
    color: MAIN_GREEN,
    fontSize: 24,
    fontWeight: '900',
  },
  statusLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6,
  },
});
