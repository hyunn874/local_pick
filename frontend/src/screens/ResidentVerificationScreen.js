import { useCallback, useEffect, useMemo, useState } from 'react';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import apiClient from '../api/apiClient';
import { verifyResidentByLocation } from '../api/authApi';
import { useAuth } from '../contexts/AuthContext';
import { useRegions } from '../hooks/useRegions';

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
    return '거주자 인증 완료';
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

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko-KR'));
}

function RegionPickerColumn({ title, options, selectedValue, onSelect }) {
  return (
    <View style={styles.pickerColumn}>
      <Text style={styles.pickerColumnTitle}>{title}</Text>
      <View style={styles.pickerSelectionGuide} pointerEvents="none" />
      <ScrollView
        style={styles.pickerScroll}
        contentContainerStyle={styles.pickerScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option) => {
          const isSelected = option === selectedValue;

          return (
            <TouchableOpacity
              key={option}
              style={[styles.pickerOption, isSelected && styles.selectedPickerOption]}
              activeOpacity={0.7}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.pickerOptionText, isSelected && styles.selectedPickerOptionText]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function ResidentVerificationScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { regions, isLoading: isLoadingRegions, error: regionsError, reload: reloadRegions } = useRegions();
  const [step, setStep] = useState(1);
  const [selectedSido, setSelectedSido] = useState(user?.region?.sidoName || '');
  const [selectedSigungu, setSelectedSigungu] = useState(user?.region?.sigunguName || '');
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [residentStatus, setResidentStatus] = useState({
    isVerified: false,
    verifyCount: 0,
    requiredCount: 2,
    lastVerifyDate: null,
    nextVerifyDate: null,
    badgeStatus: 'inactive',
  });
  const [isCheckingLocation, setIsCheckingLocation] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const sidoOptions = useMemo(() => unique(regions.map((region) => region.sidoName)), [regions]);
  const regionsBySido = useMemo(
    () => regions.filter((region) => region.sidoName === selectedSido),
    [regions, selectedSido],
  );
  const sigunguOptions = useMemo(
    () => unique(regionsBySido.map((region) => region.sigunguName)),
    [regionsBySido],
  );
  const selectedRegion = useMemo(
    () => regionsBySido.find((region) => region.sigunguName === selectedSigungu) || null,
    [regionsBySido, selectedSigungu],
  );
  const canContinue = Boolean(selectedRegion);
  const nextVerifyDate = residentStatus.nextVerifyDate;
  const isBadgeActive = residentStatus.badgeStatus === 'active' || residentStatus.isVerified;
  const statusVerifyCount = residentStatus.verifyCount ?? confirmedCount;
  const requiredVerifyCount = residentStatus.requiredCount ?? 2;
  const verifyCountLabel = getVerifyCountLabel(Number(statusVerifyCount || 0));
  const nextVerifyInfo = getNextVerifyInfo(nextVerifyDate);
  const isVerifyLocked = !nextVerifyInfo.isAvailable;
  const verifyButtonText = isVerifyLocked
    ? `다음 인증 가능일: ${nextVerifyDate}`
    : '지금 위치 인증하기';

  useEffect(() => {
    if (selectedSido || sidoOptions.length === 0) {
      return;
    }

    const currentSido = user?.region?.sidoName;
    setSelectedSido(sidoOptions.includes(currentSido) ? currentSido : sidoOptions[0]);
  }, [selectedSido, sidoOptions, user?.region?.sidoName]);

  useEffect(() => {
    if (sigunguOptions.length === 0) {
      setSelectedSigungu('');
      return;
    }

    if (!sigunguOptions.includes(selectedSigungu)) {
      const currentSigungu = user?.region?.sigunguName || '';
      setSelectedSigungu(sigunguOptions.includes(currentSigungu) ? currentSigungu : sigunguOptions[0]);
    }
  }, [selectedSigungu, sigunguOptions, user?.region?.sigunguName]);

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
      const statusVerifyCount = Number(status?.verifyCount ?? 0);
      await updateUser({
        isResidentVerified: Boolean(status?.residentAccess),
        badgeStatus: status?.badgeStatus || (status?.isVerified ? 'active' : 'inactive'),
        nextVerifyDate: status?.nextVerifyDate,
        verifyCount: statusVerifyCount,
        requiredCount: Number(status?.requiredCount ?? 2),
        region: status?.region || null,
      });
    } catch (error) {
    } finally {
      setIsLoadingStatus(false);
    }
  }, [updateUser]);

  useEffect(() => {
    void loadResidentStatus();
  }, [loadResidentStatus]);

  const handleNext = () => {
    if (!canContinue) {
      return;
    }

    setStep(2);
  };

  const handleVerificationResult = useCallback(async (verification) => {
    const nextCount = Math.min(
      verification?.requiredCount ?? 2,
      verification?.verifyCount ?? confirmedCount + 1,
    );

    setConfirmedCount(nextCount);
    setResidentStatus((currentStatus) => ({
      ...currentStatus,
      ...verification,
      verifyCount: nextCount,
      requiredCount: verification?.requiredCount ?? residentStatus.requiredCount ?? 2,
      badgeStatus: verification?.badgeStatus || (verification?.isVerified ? 'active' : currentStatus.badgeStatus),
    }));
    await updateUser({
      isResidentVerified: Boolean(verification?.residentAccess),
      badgeStatus: verification?.badgeStatus || (verification?.isVerified ? 'active' : 'inactive'),
      nextVerifyDate: verification?.nextVerifyDate,
      verifyCount: nextCount,
      requiredCount: verification?.requiredCount ?? residentStatus.requiredCount ?? 2,
      region: verification?.region || user?.region,
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

    Alert.alert(
      '1차 인증 완료',
      '이제 해당 지역 소통방을 이용할 수 있어요.',
      [
        {
          text: '소통방으로 이동',
          onPress: () => {
            navigation.navigate('AuthGate', { screen: 'ChatRoom' });
          },
        },
      ],
    );
  }, [confirmedCount, loadResidentStatus, navigation, updateUser, user?.region]);

  const handleVerifyLocation = async () => {
    if (isCheckingLocation || isVerifyLocked) {
      return;
    }

    if (!selectedRegion) {
      Alert.alert('지역 선택', '거주 지역을 먼저 선택해주세요.');
      setStep(1);
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

      try {
        const verification = await verifyResidentByLocation({
          latitude,
          longitude,
          sidoName: selectedRegion.sidoName,
          sigunguName: selectedRegion.sigunguName,
        });
        await handleVerificationResult(verification);
      } catch (error) {
        if (error?.code === 'A007') {
          throw error;
        }

        if (error?.code === 'A008') {
          Alert.alert(
            '거주 지역이 달라요',
            `선택한 지역은 ${selectedRegion.sidoName} ${selectedRegion.sigunguName}이지만, 현재 GPS 위치가 이 지역으로 확인되지 않았어요.\n실제 거주 지역을 다시 선택한 뒤 현재 위치에서 인증해주세요.`,
            [
              {
                text: '지역 다시 선택',
                onPress: () => setStep(1),
              },
            ],
          );
          return;
        }

        Alert.alert(
          '위치 확인 실패',
          '현재 위치의 행정구역을 확인할 수 없어요.\n'
          + 'Wi-Fi를 켜거나 실제 기기에서 다시 시도해주세요.',
          [
            {
              text: '확인',
            },
          ],
        );
        return;
      }
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
              <Text style={[styles.stepText, styles.activeStepText]}>거주 지역 선택</Text>
              <Text style={[styles.stepText, step === 2 && styles.activeStepText]}>
                GPS 위치 확인
              </Text>
            </View>
          </View>

          {step === 1 ? (
            <View style={styles.panel}>
              <Text style={styles.title}>거주 지역을 선택해주세요</Text>
              <Text style={styles.subtitle}>광역 시·도와 기초 시·군을 선택하면 인증 지역으로 저장돼요</Text>
              {isLoadingRegions ? (
                <View style={styles.regionLoadingBox}>
                  <ActivityIndicator color={MAIN_GREEN} />
                  <Text style={styles.regionLoadingText}>행정구역을 불러오고 있어요...</Text>
                </View>
              ) : regionsError ? (
                <View style={styles.regionLoadingBox}>
                  <Text style={styles.regionErrorText}>지역 목록을 불러오지 못했어요.</Text>
                  <TouchableOpacity style={styles.retryButton} activeOpacity={0.7} onPress={() => reloadRegions()}>
                    <Text style={styles.retryButtonText}>다시 불러오기</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.pickerWrap}>
                    <RegionPickerColumn
                      title="광역 시·도"
                      options={sidoOptions}
                      selectedValue={selectedSido}
                      onSelect={setSelectedSido}
                    />
                    <RegionPickerColumn
                      title="기초 시·군"
                      options={sigunguOptions}
                      selectedValue={selectedSigungu}
                      onSelect={setSelectedSigungu}
                    />
                  </View>
                  {selectedRegion && (
                    <View style={styles.selectedRegionBox}>
                      <Text style={styles.selectedRegionLabel}>선택한 거주지</Text>
                      <Text style={styles.selectedRegionText}>
                        {selectedRegion.sidoName} {selectedRegion.sigunguName}
                      </Text>
                    </View>
                  )}
                </>
              )}
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
              <Text style={styles.subtitle}>
                거주자 인증을 위해 현재 위치를 행정구역으로 변환해요
              </Text>
              <View style={styles.progressBox}>
                <Text style={styles.progressLabel}>현재 진행</Text>
                <Text style={styles.progressValue}>
                  {Math.min(statusVerifyCount, requiredVerifyCount)}/{requiredVerifyCount} 회 완료
                </Text>
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
  regionLoadingBox: {
    alignItems: 'center',
    backgroundColor: '#F5F1EA',
    borderRadius: 8,
    gap: 10,
    marginTop: 20,
    minHeight: 160,
    justifyContent: 'center',
    padding: 18,
  },
  regionLoadingText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
  regionErrorText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: CARD,
    fontSize: 13,
    fontWeight: '900',
  },
  pickerWrap: {
    backgroundColor: '#F5F1EA',
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 22,
    padding: 10,
  },
  pickerColumn: {
    flex: 1,
    position: 'relative',
  },
  pickerColumnTitle: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerScroll: {
    maxHeight: 170,
  },
  pickerScrollContent: {
    gap: 6,
    paddingVertical: 52,
  },
  pickerSelectionGuide: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: BORDER,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 82,
  },
  pickerOption: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 8,
  },
  selectedPickerOption: {
    backgroundColor: CARD,
    borderColor: MAIN_GREEN,
    borderWidth: 1,
  },
  pickerOptionText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  selectedPickerOptionText: {
    color: TEXT_PRIMARY,
    fontWeight: '900',
  },
  selectedRegionBox: {
    backgroundColor: '#E7EFE9',
    borderRadius: 8,
    marginTop: 14,
    padding: 14,
  },
  selectedRegionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
  },
  selectedRegionText: {
    color: MAIN_GREEN,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
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
