import { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { checkNicknameAvailability } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const NICKNAME_PATTERN = /^[가-힣A-Za-z0-9_]{2,12}$/;
const NICKNAME_CHECK_DELAY_MS = 400;
const GENERATION_OPTIONS = [
  { emoji: '🌱', label: '20대', value: 'TWENTIES' },
  { emoji: '🌿', label: '30-40대', value: 'THIRTIES_FORTIES' },
  { emoji: '🌳', label: '50대 이상', value: 'FIFTIES_PLUS' },
];

export default function OnboardingScreen() {
  const { completeOnboarding, user } = useAuth();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(1);
  const [nickname, setNickname] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState('idle');
  const [isNicknameFocused, setIsNicknameFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const translateX = useSharedValue(0);

  const trimmedNickname = useMemo(() => nickname.trim(), [nickname]);
  const isNicknameFormatValid = NICKNAME_PATTERN.test(trimmedNickname);
  const isResidentVerified = Boolean(
    user?.isResidentVerified || user?.badgeStatus === 'active',
  );

  useEffect(() => {
    if (!trimmedNickname) {
      setNicknameStatus('idle');
      return undefined;
    }

    if (!isNicknameFormatValid) {
      setNicknameStatus('invalid');
      return undefined;
    }

    let isActive = true;
    setNicknameStatus('checking');
    const timeoutId = setTimeout(async () => {
      try {
        const isAvailable = await checkNicknameAvailability(trimmedNickname);
        if (isActive) {
          setNicknameStatus(isAvailable ? 'available' : 'duplicate');
        }
      } catch {
        if (isActive) {
          setNicknameStatus('error');
        }
      }
    }, NICKNAME_CHECK_DELAY_MS);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [isNicknameFormatValid, trimmedNickname]);

  const nicknameGuide = useMemo(() => {
    switch (nicknameStatus) {
      case 'invalid':
        return { color: '#C65B2E', text: '2-12자의 한글, 영문, 숫자, 밑줄만 사용할 수 있어요.' };
      case 'checking':
        return { color: '#6E766F', text: '닉네임을 확인하고 있어요.' };
      case 'available':
        return { color: MAIN_GREEN, text: '사용 가능한 닉네임이에요.' };
      case 'duplicate':
        return { color: '#C65B2E', text: '이미 사용 중인 닉네임이에요.' };
      case 'error':
        return { color: '#C65B2E', text: '닉네임 확인에 실패했어요. 잠시 후 다시 시도해주세요.' };
      default:
        return { color: '#9E9E9E', text: '2-12자로 입력해주세요.' };
    }
  }, [nicknameStatus]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const moveToStep = (nextStep) => {
    if (isTransitioning || nextStep === step) {
      return;
    }

    const direction = nextStep > step ? 1 : -1;
    setIsTransitioning(true);
    translateX.value = withTiming(-direction * width, { duration: 250 });
    setTimeout(() => {
      setStep(nextStep);
      translateX.value = direction * width;
      translateX.value = withTiming(0, { duration: 250 });
      setIsTransitioning(false);
    }, 250);
  };

  const handleNext = () => {
    if (step === 1) {
      if (nicknameStatus !== 'available') {
        Alert.alert('닉네임을 확인해주세요', '사용 가능한 닉네임을 입력해주세요.');
        return;
      }
      moveToStep(2);
      return;
    }

    if (!selectedGeneration) {
      Alert.alert('세대를 선택해주세요', '추천을 위해 세대를 선택해주세요.');
      return;
    }
    moveToStep(3);
  };

  const handleComplete = async () => {
    if (!trimmedNickname || !selectedGeneration || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOnboarding({ nickname: trimmedNickname, generationTag: selectedGeneration });
    } catch (error) {
      Alert.alert('온보딩 실패', error?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = `${Math.round((step / 3) * 100)}%`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.progressHeader}>
          <Text style={styles.stepCounter}>{step}/3</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progress }]} />
          </View>
        </View>

        <Animated.View style={[styles.content, { width }, contentStyle]}>
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>어떻게 불러드릴까요?</Text>
              <Text style={styles.subtitle}>소통방에서 사용할 닉네임이에요</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={12}
                placeholder="예: 유성구주민"
                placeholderTextColor="#BDBDBD"
                returnKeyType="next"
                style={[
                  styles.nicknameInput,
                  isNicknameFocused && styles.nicknameInputFocused,
                  ['invalid', 'duplicate', 'error'].includes(nicknameStatus) && styles.nicknameInputError,
                ]}
                value={nickname}
                onChangeText={setNickname}
                onFocus={() => setIsNicknameFocused(true)}
                onBlur={() => setIsNicknameFocused(false)}
                onSubmitEditing={handleNext}
              />
              <View style={styles.nicknameGuideRow}>
                {nicknameStatus === 'checking' ? (
                  <ActivityIndicator size="small" color="#9E9E9E" />
                ) : (
                  <Ionicons
                    name={nicknameStatus === 'available' ? 'checkmark-circle' : 'information-circle'}
                    size={17}
                    color={nicknameGuide.color}
                  />
                )}
                <Text style={[styles.nicknameGuideText, { color: nicknameGuide.color }]}>
                  {nicknameGuide.text}
                </Text>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>어떤 세대이신가요?</Text>
              <Text style={styles.subtitle}>세대에 맞는 명소를 추천해드려요</Text>
              <View style={styles.generationList}>
                {GENERATION_OPTIONS.map((option) => {
                  const isSelected = selectedGeneration === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: isSelected }}
                      style={[styles.generationCard, isSelected && styles.selectedGenerationCard]}
                      onPress={() => setSelectedGeneration(option.value)}
                    >
                      <Text style={styles.generationEmoji}>{option.emoji}</Text>
                      <Text style={[styles.generationText, isSelected && styles.selectedGenerationText]}>
                        {option.label}
                      </Text>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={MAIN_GREEN} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={styles.title}>거주지를 인증할까요?</Text>
              <Text style={styles.subtitle}>인증하면 소통방에서 바로 글을 쓸 수 있어요</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoRow}>📍  GPS로 현재 위치 확인</Text>
                <Text style={styles.infoRow}>✓  처음 2회는 1주 간격으로 인증</Text>
                <Text style={styles.infoRow}>✓  이후 매월 1회 유지</Text>
              </View>
              {isResidentVerified && (
                <View style={styles.completedMessage}>
                  <Ionicons name="checkmark-circle" size={20} color={MAIN_GREEN} />
                  <Text style={styles.completedMessageText}>거주자 인증이 완료됐어요.</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        <View style={styles.footer}>
          {step > 1 && (
            <Pressable
              accessibilityRole="button"
              disabled={isTransitioning}
              style={styles.previousButton}
              onPress={() => moveToStep(step - 1)}
            >
              <Text style={styles.previousButtonText}>이전</Text>
            </Pressable>
          )}

          {step < 3 ? (
            <Pressable
              accessibilityRole="button"
              disabled={isTransitioning}
              style={[
                styles.primaryButton,
                ((step === 1 && nicknameStatus !== 'available') || (step === 2 && !selectedGeneration)) &&
                  styles.disabledButton,
              ]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>다음</Text>
            </Pressable>
          ) : (
            <>
              {!isResidentVerified && (
                <Pressable
                  accessibilityRole="button"
                  style={styles.primaryButton}
                  onPress={() => navigation.navigate('ResidentVerification')}
                >
                  <Text style={styles.primaryButtonText}>지금 인증하기</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                style={styles.laterButton}
                onPress={handleComplete}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#9E9E9E" />
                ) : (
                  <Text style={styles.laterButtonText}>나중에 할게요</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: BACKGROUND, flex: 1 },
  container: { flex: 1, paddingHorizontal: 28 },
  progressHeader: { paddingTop: 16 },
  stepCounter: { color: '#9E9E9E', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  progressTrack: { backgroundColor: '#E8E8E8', borderRadius: 999, height: 4, overflow: 'hidden' },
  progressFill: { backgroundColor: MAIN_GREEN, borderRadius: 999, height: 4 },
  content: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: -28,
    marginRight: -28,
    overflow: 'hidden',
  },
  stepContent: { paddingHorizontal: 28 },
  title: { color: '#1A2B23', fontSize: 26, fontWeight: '700', lineHeight: 36 },
  subtitle: { color: '#7A9B8A', fontSize: 15, lineHeight: 22, marginTop: 8 },
  nicknameInput: {
    borderBottomColor: '#E0E0E0',
    borderBottomWidth: 1.5,
    color: '#1A2B23',
    fontSize: 22,
    fontWeight: '600',
    marginTop: 42,
    paddingVertical: 12,
  },
  nicknameInputError: { borderBottomColor: '#C65B2E' },
  nicknameInputFocused: { borderBottomColor: MAIN_GREEN },
  nicknameGuideRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 10, minHeight: 22 },
  nicknameGuideText: { flex: 1, fontSize: 12, lineHeight: 18 },
  generationList: { gap: 12, marginTop: 36 },
  generationCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E0E0',
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    height: 64,
    paddingHorizontal: 18,
  },
  selectedGenerationCard: { backgroundColor: '#F0F7F4', borderColor: MAIN_GREEN },
  generationEmoji: { fontSize: 24, marginRight: 14 },
  generationText: { color: '#424242', flex: 1, fontSize: 16, fontWeight: '600' },
  selectedGenerationText: { color: MAIN_GREEN, fontWeight: '700' },
  infoCard: { backgroundColor: '#F0F7F4', borderRadius: 20, marginTop: 36, padding: 20 },
  infoRow: { color: '#3F5F4D', fontSize: 14, lineHeight: 22, marginVertical: 4 },
  completedMessage: { alignItems: 'center', flexDirection: 'row', marginTop: 18 },
  completedMessageText: { color: MAIN_GREEN, fontSize: 14, fontWeight: '700', marginLeft: 8 },
  footer: { paddingBottom: 24 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    width: '100%',
  },
  disabledButton: { backgroundColor: '#E0E0E0' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  previousButton: { alignItems: 'center', height: 44, justifyContent: 'center', marginBottom: 4 },
  previousButtonText: { color: '#9E9E9E', fontSize: 15, fontWeight: '600' },
  laterButton: { alignItems: 'center', height: 48, justifyContent: 'center', marginTop: 12 },
  laterButtonText: { color: '#9E9E9E', fontSize: 15 },
});
