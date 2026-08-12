import { useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const KAKAO_YELLOW = '#FEE500';

export default function LoginScreen({ onLoginSuccess = null }) {
  const iconAnimation = useSharedValue(0);
  const copyAnimation = useSharedValue(0);
  const buttonAnimation = useSharedValue(0);

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

  const handleKakaoLogin = () => {
    onLoginSuccess?.({
      provider: 'kakao',
      mode: 'bypass',
    });
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
            style={styles.kakaoButton}
            activeOpacity={0.85}
            onPress={handleKakaoLogin}
          >
            <Text style={styles.kakaoButtonText}>카카오로 시작하기</Text>
          </TouchableOpacity>
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
  kakaoButtonText: {
    color: '#191919',
    fontSize: 16,
    fontWeight: '700',
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
