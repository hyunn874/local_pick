import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';

const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const MAIN_GREEN = '#2D5C44';
const TEXT_PRIMARY = '#1A2B23';
const TEXT_DANGER = '#D94848';
const DIVIDER = '#F0F0F0';

function MenuRow({
  children = null,
  danger = false,
  label,
  labelStyle = null,
  onPress = null,
  rightText = null,
  showArrow = true,
}) {
  return (
    <TouchableOpacity
      style={styles.menuRow}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      onPress={onPress}
    >
      <Text style={[styles.menuLabel, danger && styles.dangerText, labelStyle]}>
        {label}
      </Text>
      <View style={styles.menuRight}>
        {rightText ? <Text style={styles.rightText}>{rightText}</Text> : children}
        {showArrow && <Text style={styles.arrowText}>&gt;</Text>}
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  const handleWithdraw = () => {
    Alert.alert(
      '회원탈퇴',
      '탈퇴하면 모든 데이터가 삭제되며 복구할 수 없어요. 정말 탈퇴하시겠어요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => {
            void logout();
            Alert.alert('탈퇴 완료', '그동안 로컬픽을 이용해주셔서 감사해요.');
          },
        },
      ],
    );
  };

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
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.menuList}>
        <MenuRow label="이용약관" onPress={() => navigation.navigate('Terms')} />
        <View style={styles.divider} />
        <MenuRow label="개인정보처리방침" onPress={() => navigation.navigate('PrivacyPolicy')} />
        <View style={styles.divider} />
        <MenuRow
          label="문의하기"
          onPress={() => Alert.alert('문의', 'localpick.official@gmail.com')}
        />
        <View style={styles.divider} />
        <MenuRow label="앱 버전" rightText="1.0.0" showArrow={false} />
        <View style={styles.divider} />
        <MenuRow label="로그아웃" danger onPress={handleLogout} />
        <View style={styles.divider} />
        <MenuRow
          label="회원탈퇴"
          danger
          labelStyle={styles.withdrawLabel}
          onPress={handleWithdraw}
        />
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
  menuList: {
    backgroundColor: CARD,
    marginTop: 12,
  },
  menuRow: {
    alignItems: 'center',
    backgroundColor: CARD,
    flexDirection: 'row',
    height: 56,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  menuLabel: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  dangerText: {
    color: TEXT_DANGER,
  },
  withdrawLabel: {
    fontSize: 14,
  },
  menuRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  rightText: {
    color: '#6E766F',
    fontSize: 14,
    fontWeight: '700',
  },
  arrowText: {
    color: '#A5AAA5',
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    backgroundColor: DIVIDER,
    height: 1,
    marginLeft: 20,
  },
});
