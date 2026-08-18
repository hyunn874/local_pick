import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL } from '../../api/apiClient';
import { fetchWeeklyVisitors } from '../../api/devApi';
import { useRegions } from '../../hooks/useRegions';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const DANGER = '#C2410C';

/** 방문자수 집계를 수행한 주 (백엔드에 저장되어 있는 기간) */
const SAMPLE_WEEK = '2021-05-13';

function Section({ title, subtitle, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function StatusLine({ label, value, tone }) {
  return (
    <View style={styles.statusLine}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text
        style={[
          styles.statusValue,
          tone === 'danger' && styles.statusValueDanger,
          tone === 'ok' && styles.statusValueOk,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

export default function DevScreen() {
  const { regions, sidoList, isLoading, error, reload } = useRegions();

  const [visitors, setVisitors] = useState(null);
  const [visitorError, setVisitorError] = useState(null);
  const [visitorLoading, setVisitorLoading] = useState(false);

  const loadVisitors = async () => {
    setVisitorLoading(true);
    setVisitorError(null);

    try {
      const data = await fetchWeeklyVisitors(SAMPLE_WEEK, { limit: 10, order: 'asc' });
      setVisitors(data);
    } catch (err) {
      setVisitorError(err.message);
      setVisitors(null);
    } finally {
      setVisitorLoading(false);
    }
  };

  useEffect(() => {
    loadVisitors();
  }, []);

  const withDensity = regions.filter((region) => region.densityTier).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>백엔드 연동 확인</Text>
        <Text style={styles.pageSubtitle}>개발용 화면 · 배포 시 제외</Text>

        <Section title="연결 정보">
          <StatusLine label="서버 주소" value={API_BASE_URL} />
          <StatusLine
            label="지역 API"
            value={isLoading ? '요청 중…' : error ? '실패' : '정상'}
            tone={error ? 'danger' : isLoading ? undefined : 'ok'}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Section>

        <Section
          title="행정구역 마스터"
          subtitle="공사 방문자수 API 응답으로 자동 생성"
        >
          {isLoading ? (
            <ActivityIndicator color={MAIN_GREEN} />
          ) : (
            <>
              <StatusLine label="전체 지역" value={`${regions.length}개`} />
              <StatusLine label="시·도" value={`${sidoList.length}개`} />
              <StatusLine
                label="인구밀도 산정"
                value={`${withDensity} / ${regions.length}개`}
              />
              {withDensity < regions.length ? (
                <Text style={styles.hint}>
                  인구·면적이 비어 있는 지역은 기본 채택 기준(8표)이 적용됩니다.
                  KOSIS 데이터를 regions.csv 에 넣으면 채워집니다.
                </Text>
              ) : null}
            </>
          )}
        </Section>

        {regions.length > 0 ? (
          <Section title="지역 샘플" subtitle="앞에서 5개">
            {regions.slice(0, 5).map((region) => (
              <View key={region.regionCode} style={styles.regionRow}>
                <View style={styles.regionMain}>
                  <Text style={styles.regionName}>{region.fullName}</Text>
                  <Text style={styles.regionCode}>{region.regionCode}</Text>
                </View>
                <View style={styles.regionMeta}>
                  <Text style={styles.regionTier}>
                    {region.densityTier ?? '미집계'}
                  </Text>
                  <Text style={styles.regionThreshold}>
                    {region.adoptionThreshold}표
                  </Text>
                </View>
              </View>
            ))}
          </Section>
        ) : null}

        <Section
          title="주간 방문자수"
          subtitle={`${SAMPLE_WEEK} 주간 · 외지인 적은 순`}
        >
          {visitorLoading ? (
            <ActivityIndicator color={MAIN_GREEN} />
          ) : visitorError ? (
            <>
              <Text style={styles.errorText}>{visitorError}</Text>
              <Pressable style={styles.retryButton} onPress={loadVisitors}>
                <Text style={styles.retryLabel}>다시 시도</Text>
              </Pressable>
            </>
          ) : visitors ? (
            <>
              <StatusLine
                label="집계 지역"
                value={`${visitors.totalRegions}개`}
              />
              <StatusLine
                label="7일 미만"
                value={`${visitors.incompleteRegions}개`}
                tone={visitors.incompleteRegions > 0 ? 'danger' : 'ok'}
              />
              <View style={styles.divider} />
              {visitors.regions?.map((row, index) => (
                <View key={row.region} style={styles.visitorRow}>
                  <Text style={styles.visitorRank}>{index + 1}</Text>
                  <Text style={styles.visitorName} numberOfLines={1}>
                    {row.region}
                  </Text>
                  <Text style={styles.visitorCount}>
                    {row.outsider.toLocaleString()}
                  </Text>
                  <Text style={styles.visitorRatio}>{row.outsiderRatio}%</Text>
                </View>
              ))}
            </>
          ) : null}
        </Section>

        <Pressable
          style={styles.refreshButton}
          onPress={() => {
            reload();
            loadVisitors();
          }}
        >
          <Text style={styles.refreshLabel}>전체 새로고침</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '900',
  },
  pageSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    marginBottom: 20,
    marginTop: 4,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  statusLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  statusLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
  },
  statusValue: {
    color: TEXT_PRIMARY,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  statusValueOk: {
    color: MAIN_GREEN,
  },
  statusValueDanger: {
    color: DANGER,
  },
  hint: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  errorText: {
    color: DANGER,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  regionRow: {
    borderBottomColor: BORDER,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
  },
  regionMain: {
    flex: 1,
  },
  regionName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
  },
  regionCode: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  regionMeta: {
    alignItems: 'flex-end',
  },
  regionTier: {
    color: MAIN_GREEN,
    fontSize: 12,
    fontWeight: '800',
  },
  regionThreshold: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    backgroundColor: BORDER,
    height: 1,
    marginVertical: 10,
  },
  visitorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 7,
  },
  visitorRank: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '800',
    width: 22,
  },
  visitorName: {
    color: TEXT_PRIMARY,
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  visitorCount: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    width: 72,
  },
  visitorRatio: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    textAlign: 'right',
    width: 48,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 8,
    marginTop: 12,
    paddingVertical: 10,
  },
  retryLabel: {
    color: CARD,
    fontSize: 13,
    fontWeight: '800',
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: MAIN_GREEN,
    borderRadius: 10,
    paddingVertical: 14,
  },
  refreshLabel: {
    color: CARD,
    fontSize: 14,
    fontWeight: '900',
  },
});
