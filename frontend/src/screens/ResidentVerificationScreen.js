import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { getReverseGeocoding } from '../api/kakaoApi';
import { verifyResident } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';

const BACKGROUND = '#F8F6F1';
const MAIN_GREEN = '#2D5C44';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';

function parseRegionText(regionText) {
  const [sidoName, ...sigunguParts] = regionText.trim().split(/\s+/);
  const sigunguName = sigunguParts.join(' ');

  if (!sidoName || !sigunguName) {
    throw new Error('행정구역 정보를 확인할 수 없어요.');
  }

  return { sidoName, sigunguName };
}

export default function ResidentVerificationScreen({ navigation }) {
  const { updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [regionInput, setRegionInput] = useState('');
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const trimmedRegion = regionInput.trim();
  const canContinue = trimmedRegion.length > 0;

  const handleNext = () => {
    if (!canContinue) {
      return;
    }

    setStep(2);
  };

  const handleVerifyLocation = async () => {
    if (isCheckingLocation) {
      return;
    }

    setIsCheckingLocation(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('위치 권한이 필요해요', '거주자 인증을 위해 위치 접근을 허용해주세요.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const regionText = await getReverseGeocoding(latitude, longitude);
      const { sidoName, sigunguName } = parseRegionText(regionText);
      const verification = await verifyResident({ sidoName, sigunguName });

      const nextCount = Math.min(
        verification?.requiredCount ?? 3,
        verification?.verifyCount ?? confirmedCount + 1,
      );
      setConfirmedCount(nextCount);

      if (verification?.isVerified) {
        Alert.alert(
          '거주자 인증 완료! 🎉',
          '거주자 배지가 부여됐어요.',
          [
            {
              text: '확인',
              onPress: async () => {
                await updateUser((currentUser) => ({
                  ...(currentUser || {}),
                  district: `${sidoName} ${sigunguName}`,
                  isResidentVerified: true,
                  region: currentUser?.region || {
                    sidoName,
                    sigunguName,
                    fullName: `${sidoName} ${sigunguName}`,
                  },
                }));
                navigation.goBack();
              },
            },
          ],
        );
      }
    } catch (error) {
      Alert.alert('위치 확인 실패', error?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setIsCheckingLocation(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
          <Text style={styles.headerTitle}>거주자 인증</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.stepCard}>
            <Text style={styles.stepLabel}>Step {step}/2</Text>
            <View style={styles.stepTrack}>
              <View style={styles.stepTrackFill} />
              <View style={[styles.stepTrackFill, step === 1 && styles.inactiveStepTrackFill]} />
            </View>
            <View style={styles.stepTextRow}>
              <Text style={[styles.stepText, styles.activeStepText]}>거주 지역 입력</Text>
              <Text style={[styles.stepText, step === 2 && styles.activeStepText]}>
                GPS 위치 확인
              </Text>
            </View>
          </View>

          {step === 1 ? (
            <View style={styles.panel}>
              <Text style={styles.title}>거주 지역을 입력해주세요</Text>
              <Text style={styles.subtitle}>실제 거주하시는 시·군·구를 입력해주세요</Text>
              <TextInput
                style={styles.input}
                value={regionInput}
                onChangeText={setRegionInput}
                placeholder="예: 서울 은평구"
                placeholderTextColor="#9B9F98"
                returnKeyType="next"
                onSubmitEditing={handleNext}
              />
              <TouchableOpacity
                style={[styles.primaryButton, !canContinue && styles.disabledButton]}
                activeOpacity={0.7}
                disabled={!canContinue}
                onPress={handleNext}
              >
                <Text style={styles.primaryButtonText}>다음</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.title}>GPS로 위치를 확인해요</Text>
              <Text style={styles.subtitle}>7일 안에 3회 위치 확인이 필요해요</Text>
              <View style={styles.progressBox}>
                <Text style={styles.progressLabel}>현재 진행</Text>
                <Text style={styles.progressValue}>{confirmedCount}/3 회 완료</Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryButton, isCheckingLocation && styles.disabledButton]}
                activeOpacity={0.7}
                disabled={isCheckingLocation}
                onPress={handleVerifyLocation}
              >
                {isCheckingLocation ? (
                  <ActivityIndicator color={CARD} />
                ) : (
                  <Text style={styles.primaryButtonText}>지금 위치 확인하기</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  keyboardAvoidingView: {
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
    flex: 1,
    padding: 20,
  },
  stepCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    marginBottom: 18,
    padding: 16,
  },
  stepLabel: {
    color: MAIN_GREEN,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 12,
  },
  stepTrack: {
    flexDirection: 'row',
    gap: 6,
  },
  stepTrackFill: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 999,
    flex: 1,
    height: 6,
  },
  inactiveStepTrackFill: {
    backgroundColor: '#DED8CF',
  },
  stepTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  stepText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
  },
  activeStepText: {
    color: MAIN_GREEN,
  },
  panel: {
    backgroundColor: CARD,
    borderRadius: 8,
    padding: 20,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
  },
  input: {
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 24,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    marginTop: 18,
  },
  disabledButton: {
    opacity: 0.35,
  },
  primaryButtonText: {
    color: CARD,
    fontSize: 16,
    fontWeight: '900',
  },
  progressBox: {
    backgroundColor: '#E7EFE9',
    borderRadius: 8,
    marginTop: 24,
    padding: 18,
  },
  progressLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  progressValue: {
    color: MAIN_GREEN,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
});
