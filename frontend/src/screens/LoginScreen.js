import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useAuth } from '../contexts/AuthContext';

const KAKAO_YELLOW = '#FEE500';
const isKakaoLoginEnabled = process.env.EXPO_PUBLIC_ENABLE_KAKAO_LOGIN === 'true';

export default function LoginScreen() {
  const { devLogin, loginWithKakao } = useAuth();
  const iconAnimation = useSharedValue(0);
  const copyAnimation = useSharedValue(0);
  const buttonAnimation = useSharedValue(0);
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  useEffect(() => {
    iconAnimation.value = withTiming(1, { duration: 700 });
    copyAnimation.value = withDelay(150, withTiming(1, { duration: 600 }));
    buttonAnimation.value = withDelay(400, withTiming(1, { duration: 500 }));
  }, [buttonAnimation, copyAnimation, iconAnimation]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconAnimation.value,
    transform: [
      {
        translateY: (1 - iconAnimation.value) * -18,
      },
    ],
  }));

  const copyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: copyAnimation.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonAnimation.value,
    transform: [
      {
        translateY: (1 - buttonAnimation.value) * 24,
      },
    ],
  }));

  const handleLogin = async (loginAction) => {
    if (isLoginLoading) {
      return;
    }

    setIsLoginLoading(true);

    try {
      await loginAction();
    } catch (error) {
      if (error?.isAuthCancelled) {
        return;
      }

      Alert.alert('로그인 실패', error?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleKakaoLogin = () => {
    if (!isKakaoLoginEnabled) {
      return;
    }

    void handleLogin(loginWithKakao);
  };

  const handleDevLogin = () => {
    void handleLogin(devLogin);
  };

  return (
    <LinearGradient colors={['#1E3A2F', '#2D5C44']} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topArea}>
          <Text style={styles.brandText}>LocalPick</Text>
        </View>

        <View style={styles.centerArea}>
          <Animated.View style={[styles.iconHalo, iconAnimatedStyle]}>
            <Ionicons name="location" size={48} color="#FFFFFF" />
          </Animated.View>

          <Animated.View style={[styles.copyGroup, copyAnimatedStyle]}>
            <Text style={styles.mainCopyLight}>아직 아무도 모르는</Text>
            <Text style={styles.mainCopyBold}>그 동네의 진짜 명소</Text>
            <Text style={styles.subCopy}>거주자가 직접 발굴한 숨은 명소를 만나보세요</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.bottomArea, buttonAnimatedStyle]}>
          <TouchableOpacity
            style={[
              styles.kakaoButton,
              (!isKakaoLoginEnabled || isLoginLoading) && styles.disabledKakaoButton,
            ]}
            activeOpacity={0.85}
            disabled={!isKakaoLoginEnabled || isLoginLoading}
            onPress={handleKakaoLogin}
          >
            {isLoginLoading ? (
              <ActivityIndicator color="#191919" />
            ) : (
              <Text style={styles.kakaoButtonText}>
                {isKakaoLoginEnabled ? '카카오로 시작하기' : '카카오 로그인 준비 중'}
              </Text>
            )}
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity
              style={styles.devButton}
              activeOpacity={0.85}
              disabled={isLoginLoading}
              onPress={handleDevLogin}
            >
              <Text style={styles.devButtonText}>개발용으로 시작하기</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.termsText}>
            시작하면 이용약관 및 개인정보처리방침에 동의합니다
          </Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topArea: {
    alignItems: 'center',
    paddingTop: '15%',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.6,
  },
  centerArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconHalo: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  copyGroup: {
    alignItems: 'center',
    marginTop: 28,
  },
  mainCopyLight: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 36,
    textAlign: 'center',
  },
  mainCopyBold: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    marginTop: 4,
    textAlign: 'center',
  },
  subCopy: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  bottomArea: {
    paddingBottom: 24,
  },
  kakaoButton: {
    alignItems: 'center',
    backgroundColor: KAKAO_YELLOW,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    height: 56,
    justifyContent: 'center',
    marginHorizontal: 24,
    minHeight: 56,
  },
  disabledKakaoButton: {
    opacity: 0.75,
  },
  kakaoButtonText: {
    color: '#191919',
    fontSize: 16,
    fontWeight: '700',
  },
  devButton: {
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
    borderWidth: 1,
    height: 50,
    justifyContent: 'center',
    marginHorizontal: 24,
    marginTop: 10,
  },
  devButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  termsText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 16,
    opacity: 0.5,
    textAlign: 'center',
  },
});
