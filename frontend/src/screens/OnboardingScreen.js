import { useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { checkNicknameAvailability } from '../api/authApi';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const NICKNAME_PATTERN = /^[가-힣A-Za-z0-9_]{2,12}$/;
const NICKNAME_CHECK_DELAY_MS = 400;

const GENERATION_OPTIONS = [
  {
    label: '20대',
    value: 'TWENTIES',
  },
  {
    label: '30-40대',
    value: 'THIRTIES_FORTIES',
  },
  {
    label: '50대 이상',
    value: 'FIFTIES_PLUS',
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding, logout } = useAuth();
  const [nickname, setNickname] = useState('');
  const [generationTag, setGenerationTag] = useState(GENERATION_OPTIONS[0].value);
  const [nicknameStatus, setNicknameStatus] = useState('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const trimmedNickname = useMemo(() => nickname.trim(), [nickname]);
  const isNicknameFormatValid = useMemo(
    () => NICKNAME_PATTERN.test(trimmedNickname),
    [trimmedNickname],
  );
  const canSubmit =
    nicknameStatus === 'available' && Boolean(generationTag) && !isSubmitting;

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
        return {
          color: '#C65B2E',
          text: '2-12자의 한글, 영문, 숫자, 밑줄만 사용할 수 있어요.',
        };
      case 'checking':
        return {
          color: '#6E766F',
          text: '닉네임을 확인하고 있어요.',
        };
      case 'available':
        return {
          color: MAIN_GREEN,
          text: '사용 가능한 닉네임이에요.',
        };
      case 'duplicate':
        return {
          color: '#C65B2E',
          text: '이미 사용 중인 닉네임이에요.',
        };
      case 'error':
        return {
          color: '#C65B2E',
          text: '닉네임 확인에 실패했어요. 잠시 후 다시 시도해주세요.',
        };
      default:
        return {
          color: '#6E766F',
          text: '2-12자의 한글, 영문, 숫자, 밑줄을 사용할 수 있어요.',
        };
    }
  }, [nicknameStatus]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert('입력 확인', '사용 가능한 닉네임을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await completeOnboarding(trimmedNickname, generationTag);
    } catch (error) {
      Alert.alert('온보딩 실패', error?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <Ionicons name="person" size={24} color={MAIN_GREEN} />
          </View>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color="#6E766F" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>프로필을 완성해주세요</Text>
          <Text style={styles.subtitle}>동네 주민들과 만날 때 사용할 정보를 설정합니다.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              maxLength={12}
              placeholder="예: 유성구주민"
              placeholderTextColor="#A5AAA5"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onChangeText={setNickname}
            />
            <View style={styles.nicknameGuideRow}>
              {nicknameStatus === 'checking' ? (
                <ActivityIndicator size="small" color="#6E766F" />
              ) : (
                <Ionicons
                  name={nicknameStatus === 'available' ? 'checkmark-circle' : 'information-circle'}
                  size={16}
                  color={nicknameGuide.color}
                />
              )}
              <Text style={[styles.nicknameGuideText, { color: nicknameGuide.color }]}>
                {nicknameGuide.text}
              </Text>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>세대</Text>
            <View style={styles.segmentGroup}>
              {GENERATION_OPTIONS.map((option) => {
                const isSelected = generationTag === option.value;

                return (
                  <Pressable
                    key={option.value}
                    style={[styles.segmentButton, isSelected && styles.selectedSegmentButton]}
                    onPress={() => setGenerationTag(option.value)}
                  >
                    <Text style={[styles.segmentText, isSelected && styles.selectedSegmentText]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.submitButton, !canSubmit && styles.disabledButton]}
            disabled={!canSubmit}
            onPress={handleSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>시작하기</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BACKGROUND,
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: '#E7EFE9',
    borderRadius: 18,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  logoutButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  title: {
    color: '#17221B',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 36,
  },
  subtitle: {
    color: '#6E766F',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
    marginTop: 8,
  },
  fieldGroup: {
    marginTop: 30,
  },
  label: {
    color: '#17221B',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4DD',
    borderRadius: 8,
    borderWidth: 1,
    color: '#17221B',
    fontSize: 17,
    fontWeight: '800',
    height: 56,
    paddingHorizontal: 16,
  },
  nicknameGuideRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    minHeight: 20,
  },
  nicknameGuideText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  segmentGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE4DD',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  selectedSegmentButton: {
    backgroundColor: MAIN_GREEN,
    borderColor: MAIN_GREEN,
  },
  segmentText: {
    color: '#6E766F',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectedSegmentText: {
    color: '#FFFFFF',
  },
  footer: {
    paddingBottom: 24,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
