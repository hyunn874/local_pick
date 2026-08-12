import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import { colors } from '../constants/colors';
import { useKakaoLogin } from '../hooks/useKakaoLogin';

export default function MainScreen() {
  const { login } = useKakaoLogin();

  const handleKakaoLogin = async () => {
    try {
      await login();
      Alert.alert('로그인 완료', '카카오 로그인이 완료되었습니다.');
    } catch (error) {
      Alert.alert('카카오 로그인 설정 필요', error.message || '로그인에 실패했습니다.');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.title}>LocalPick</Text>
        <Text style={styles.description}>동네 소식, 장소, 로컬패스를 한 곳에서 확인하세요.</Text>
      </View>

      <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoLogin}>
        <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 12,
    marginTop: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  kakaoButton: {
    alignItems: 'center',
    backgroundColor: colors.kakao,
    borderRadius: 8,
    marginTop: 32,
    paddingVertical: 15,
  },
  kakaoButtonText: {
    color: '#191919',
    fontSize: 16,
    fontWeight: '700',
  },
});
