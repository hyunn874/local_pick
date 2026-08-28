import { useCallback, useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import apiClient from '../api/apiClient';
import { verifyResident } from '../api/authApi';
import { getReverseGeocoding } from '../api/kakaoApi';
import { useAuth } from '../contexts/AuthContext';

const BACKGROUND = '#F8F6F1';
const MAIN_GREEN = '#2D5C44';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const GRAY = '#8A918A';

function getVerifyCountLabel(verifyCount) {
  if (verifyCount <= 0) {
    return '아직 인증 전';
  }

  if (verifyCount === 1) {
    return '첫 번째 인증 완료';
  }

  if (verifyCount === 2) {
    return '두 번째 인증 완료';
  }

  return '거주자 인증 유지 중';
}

function getNextVerifyInfo(nextVerifyDate) {
  if (!nextVerifyDate) {
    return {
      isAvailable: true,
      label: '지금 인증 가능해요 ✓',
      tone: 'active',
    };
  }

  const today = new Date();
  const targetDate = new Date(nextVerifyDate);

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() <= today.getTime()) {
    return {
      isAvailable: true,
      label: targetDate.getTime() === today.getTime() ? '지금 인증 가능해요 ✓' : '인증 가능 기간이에요',
      tone: 'active',
    };
  }

  return {
    isAvailable: false,
    label: `다음 인증 가능일: ${nextVerifyDate}`,
    tone: 'inactive',
  };
}

function parseRegionText(regionText) {
  const [sidoName, ...sigunguParts] = regionText.trim().split(/\s+/);
  const sigunguName = sigunguParts.join(' ');

  if (!sidoName || !sigunguName) {
    throw new Error('행정구역 정보를 확인할 수 없어요.');
  }

  return { sidoName, sigunguName };
}

export default function ResidentVerificationScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [regionInput, setRegionInput] = useState(() => {
    if (typeof user?.region === 'string') {
      return user.region;
    }

    return user?.region?.fullName || '';
  });
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [residentStatus, setResidentStatus] = useState({
    isVerified: false,
    verifyCount: 0,
    lastVerifyDate: null,
    nextVerifyDate: null,
    badgeStatus: 'inactive',
  });
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualSidoName, setManualSidoName] = useState('');
  const [manualSigunguName, setManualSigunguName] = useState('');
  const trimmedRegion = regionInput.trim();
  const trimmedManualSidoName = manualSidoName.trim();
  const trimmedManualSigunguName = manualSigunguName.trim();
  const canContinue = trimmedRegion.length > 0;
  const canSubmitManual =
    trimmedManualSidoName.length > 0
    && trimmedManualSigunguName.length > 0
    && !isCheckingLocation;
  const nextVerifyDate = residentStatus.nextVerifyDate;
  const isBadgeActive = residentStatus.badgeStatus === 'active' || residentStatus.isVerified;
  const statusVerifyCount = residentStatus.verifyCount ?? confirmedCount;
  const verifyCountLabel = getVerifyCountLabel(Number(statusVerifyCount || 0));
  const nextVerifyInfo = getNextVerifyInfo(nextVerifyDate);
  const isVerifyLocked = !nextVerifyInfo.isAvailable;
  const verifyButtonText = isVerifyLocked
    ? `다음 인증 가능일: ${nextVerifyDate}`
    : '지금 위치 인증하기';

  const loadResidentStatus = useCallback(async () => {
    setIsLoadingStatus(true);

    try {
      const status = await apiClient.get('/api/auth/resident-status');

      setResidentStatus((currentStatus) => ({
        ...currentStatus,
        ...status,
        badgeStatus: status?.badgeStatus || (status?.isVerified ? 'active' : 'inactive'),
      }));
      setConfirmedCount(Number(status?.verifyCount ?? 0));
    } catch (error) {
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadResidentStatus();
  }, [loadResidentStatus]);

  const handleNext = () => {
    if (!canContinue) {
      return;
    }

    try {
      const { sidoName, sigunguName } = parseRegionText(trimmedRegion);

      setManualSidoName(sidoName);
      setManualSigunguName(sigunguName);
    } catch {
      setManualSidoName('');
      setManualSigunguName('');
    }

    setStep(2);
  };

  const handleVerificationResult = useCallback(async (verification) => {
    const nextCount = Math.min(
      verification?.requiredCount ?? 3,
      verification?.verifyCount ?? confirmedCount + 1,
    );

    setConfirmedCount(nextCount);
    setResidentStatus((currentStatus) => ({
      ...currentStatus,
      ...verification,
      verifyCount: nextCount,
      badgeStatus: verification?.badgeStatus || (verification?.isVerified ? 'active' : currentStatus.badgeStatus),
    }));
    await updateUser({
      isResidentVerified: Boolean(verification?.isVerified),
      badgeStatus: verification?.badgeStatus || (verification?.isVerified ? 'active' : 'inactive'),
      nextVerifyDate: verification?.nextVerifyDate,
      verifyCount: nextCount,
    });

    if (verification?.isVerified) {
      Alert.alert(
        '인증 완료! 🎉',
        `거주자 배지가 ${verification?.badgeStatus === 'active' ? '활성화' : '곧 활성화'}됩니다.\n다음 인증일: ${verification?.nextVerifyDate || '추후 안내'}`,
        [
          {
            text: '확인',
            onPress: () => {
              navigation.goBack();
            },
          },
        ],
      );
      return;
    }

    void loadResidentStatus();
  }, [confirmedCount, loadResidentStatus, navigation, updateUser]);

  const submitResidentVerification = useCallback(async ({ sidoName, sigunguName }) => {
    const verification = await verifyResident({ sidoName, sigunguName });

    await handleVerificationResult(verification);
  }, [handleVerificationResult]);

  const handleManualVerify = async () => {
    if (!canSubmitManual) {
      Alert.alert('입력 확인', '시·도와 시·군·구를 모두 입력해주세요.');
      return;
    }

    setIsCheckingLocation(true);

    try {
      await submitResidentVerification({
        sidoName: trimmedManualSidoName,
        sigunguName: trimmedManualSigunguName,
      });
    } catch (error) {
      if (error?.code === 'A007') {
        Alert.alert(
          '인증 불가',
          `아직 인증 기간이 아니에요.\n다음 인증 가능일: ${error?.data?.nextVerifyDate || nextVerifyDate || '확인 필요'}`,
        );
        return;
      }

      Alert.alert('위치 확인 실패', error?.message || '잠시 후 다시 시도해주세요.');
    } finally {
      setIsCheckingLocation(false);
    }
  };

  const handleVerifyLocation = async () => {
    if (isCheckingLocation || isVerifyLocked) {
      return;
    }

    setIsCheckingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          '위치 권한 필요',
          '거주자 인증을 위해 위치 권한이 필요해요.\n설정에서 위치 권한을 허용해주세요.',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '설정 열기',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      let regionText;

      try {
        regionText = await getReverseGeocoding(latitude, longitude);
      } catch {
        if (__DEV__) {
          setShowManualInput(true);
          return;
        }

        Alert.alert(
          '위치 확인 실패',
          '현재 위치의 행정구역을 확인할 수 없어요.\n'
          + 'Wi-Fi를 켜거나 실제 기기에서 시도해보세요.\n'
          + '또는 거주 지역을 직접 입력할 수 있어요.',
          [
            { text: '닫기', style: 'cancel' },
            {
              text: '직접 입력하기',
              onPress: () => setShowManualInput(true),
            },
          ],
        );
        return;
      }

      const { sidoName, sigunguName } = parseRegionText(regionText);

      await submitResidentVerification({ sidoName, sigunguName });
    } catch (error) {
      if (error?.code === 'A007') {
        Alert.alert(
          '인증 불가',
          `아직 인증 기간이 아니에요.\n다음 인증 가능일: ${error?.data?.nextVerifyDate || nextVerifyDate || '확인 필요'}`,
        );
        return;
      }

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

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>인증 현황</Text>
              {isLoadingStatus && <ActivityIndicator size="small" color={MAIN_GREEN} />}
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>현재 인증 횟수</Text>
              <Text style={styles.statusValue}>{verifyCountLabel}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>다음 인증 가능 날짜</Text>
              <Text
                style={[
                  styles.statusValue,
                  nextVerifyInfo.tone === 'active' ? styles.activeStatusValue : styles.inactiveStatusValue,
                ]}
              >
                {nextVerifyInfo.label}
              </Text>
            </View>
            <View style={[styles.badgeState, isBadgeActive ? styles.activeBadgeState : styles.inactiveBadgeState]}>
              <Text style={[styles.badgeStateText, isBadgeActive ? styles.activeBadgeStateText : styles.inactiveBadgeStateText]}>
                {isBadgeActive ? '거주자 배지 활성 ✓' : '거주자 배지 비활성'}
              </Text>
            </View>
            <Text style={styles.policyText}>처음 2회는 1주 간격으로 인증해주세요</Text>
            <Text style={styles.policyText}>이후 매월 1회 인증으로 배지를 유지해요</Text>
          </View>

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
                placeholder="서울특별시 은평구"
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
                <Text style={styles.progressValue}>{statusVerifyCount}/3 회 완료</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isCheckingLocation || isVerifyLocked) && styles.disabledButton,
                ]}
                activeOpacity={0.7}
                disabled={isCheckingLocation || isVerifyLocked}
                onPress={handleVerifyLocation}
              >
                {isCheckingLocation ? (
                  <ActivityIndicator color={CARD} />
                ) : (
                  <Text style={styles.primaryButtonText}>{verifyButtonText}</Text>
                )}
              </TouchableOpacity>
              {showManualInput && (
                <View style={styles.manualInputBox}>
                  <Text style={styles.manualInputTitle}>직접 입력하기</Text>
                  <Text style={styles.manualInputDescription}>
                    GPS로 행정구역 확인이 어려우면 거주 지역을 직접 입력해주세요.
                  </Text>
                  <TextInput
                    style={styles.manualInput}
                    value={manualSidoName}
                    onChangeText={setManualSidoName}
                    placeholder="시·도 예: 대전광역시"
                    placeholderTextColor="#9B9F98"
                    returnKeyType="next"
                  />
                  <TextInput
                    style={styles.manualInput}
                    value={manualSigunguName}
                    onChangeText={setManualSigunguName}
                    placeholder="시·군·구 예: 유성구"
                    placeholderTextColor="#9B9F98"
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      !canSubmitManual && styles.disabledButton,
                    ]}
                    activeOpacity={0.7}
                    disabled={!canSubmitManual}
                    onPress={handleManualVerify}
                  >
                    {isCheckingLocation ? (
                      <ActivityIndicator color={CARD} />
                    ) : (
                      <Text style={styles.primaryButtonText}>이 위치로 인증하기</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>
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
    flexGrow: 1,
    padding: 20,
  },
  statusCard: {
    backgroundColor: CARD,
    borderRadius: 8,
    marginBottom: 18,
    padding: 16,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusTitle: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '900',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statusLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  statusValue: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '900',
  },
  activeStatusValue: {
    color: MAIN_GREEN,
  },
  inactiveStatusValue: {
    color: GRAY,
  },
  badgeState: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeBadgeState: {
    backgroundColor: '#E7EFE9',
  },
  inactiveBadgeState: {
    backgroundColor: '#ECEDEE',
  },
  badgeStateText: {
    fontSize: 12,
    fontWeight: '900',
  },
  activeBadgeStateText: {
    color: MAIN_GREEN,
  },
  inactiveBadgeStateText: {
    color: GRAY,
  },
  policyText: {
    color: '#7A9B8A',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 8,
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
  manualInputBox: {
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  manualInputTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '900',
  },
  manualInputDescription: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 6,
  },
  manualInput: {
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
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
