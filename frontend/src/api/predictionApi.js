import { requestApi } from './apiClient';

const DEFAULT_HOT_LOCAL_LIMIT = 3;
const HOT_LOCAL_TIMEOUT_MS = process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 75000 : 15000;
const DEFAULT_DEV_VISITOR_WEEK = '2021-05-10';

function formatPercent(value, fallback = '-') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    return value.includes('%') ? value : `${value}%`;
  }

  return `${Math.round(value)}%`;
}

function normalizeMetric(metric, fallback) {
  return {
    id: metric?.id || fallback.id,
    label: metric?.label || fallback.label,
    value: metric?.value || fallback.value,
    colorKey: metric?.colorKey || fallback.colorKey,
    progress: Number(metric?.progress ?? fallback.progress ?? 0),
  };
}

function normalizeRankOne(region) {
  if (!region) {
    return null;
  }

  const metrics = Array.isArray(region.metrics) ? region.metrics : [];

  return {
    region: region.region || region.regionName || region.fullName || region.name || '지역명 미정',
    status: region.status || '소통방 활성화 준비 중',
    metrics: [
      normalizeMetric(metrics.find((metric) => metric.id === 'visitor'), {
        id: 'visitor',
        label: '방문자 증가율',
        value: formatPercent(region.visitorGrowthRate ?? region.visitorGrowth, '-'),
        colorKey: 'green',
        progress: region.visitorProgress ?? 0,
      }),
      normalizeMetric(metrics.find((metric) => metric.id === 'spending'), {
        id: 'spending',
        label: '소비강도 지수',
        value: region.spendingLabel || region.expenseLabel || '분석 중',
        colorKey: 'orange',
        progress: region.spendingProgress ?? region.expenseProgress ?? 0,
      }),
      normalizeMetric(metrics.find((metric) => metric.id === 'diversity'), {
        id: 'diversity',
        label: '관광객 다양성',
        value: region.diversityLabel || formatPercent(region.diversityPercentile, '분석 중'),
        colorKey: 'red',
        progress: region.diversityProgress ?? 0,
      }),
    ],
  };
}

function normalizeRankingItem(region, index) {
  return {
    rank: region.rank || `RANK ${index + 2}`,
    region: region.region || region.regionName || region.fullName || region.name || '지역명 미정',
    visitor:
      region.visitor ||
      region.visitorLabel ||
      `방문자 ${formatPercent(region.visitorGrowthRate ?? region.visitorGrowth, '-')}`,
    diversity:
      region.diversity ||
      region.diversityLabel ||
      `다양성 ${formatPercent(region.diversityPercentile, '-')}`,
  };
}

function normalizeDevVisitorRegion(region, index) {
  const outsider = Number(region?.outsider ?? 0);
  const local = Number(region?.local ?? 0);
  const foreigner = Number(region?.foreigner ?? 0);
  const total = outsider + local + foreigner;
  const outsiderRatio = Number(region?.outsiderRatio ?? 0);
  const outsiderProgress = Math.max(0, Math.min(100, Math.round(outsiderRatio)));
  const regionName = region?.region || region?.regionName || region?.fullName || '지역명 미정';

  if (index === 0) {
    return {
      region: regionName,
      status: total > 0 ? '관광공사 방문자 데이터 수집됨' : '방문자 데이터 분석 중',
      metrics: [
        {
          id: 'visitor',
          label: '외지인 방문 비율',
          value: formatPercent(outsiderRatio, '-'),
          colorKey: 'green',
          progress: outsiderProgress,
        },
        {
          id: 'spending',
          label: '외지인 방문자 수',
          value: `${outsider.toLocaleString()}명`,
          colorKey: 'orange',
          progress: total > 0 ? Math.round((outsider / total) * 100) : 0,
        },
        {
          id: 'diversity',
          label: '데이터 완성도',
          value: `${region?.days ?? 0}일 수집`,
          colorKey: 'red',
          progress: Math.max(0, Math.min(100, Math.round(((region?.days ?? 0) / 7) * 100))),
        },
      ],
    };
  }

  return {
    rank: `RANK ${index + 1}`,
    region: regionName,
    visitor: `외지인 ${outsider.toLocaleString()}명`,
    diversity: `외지인 비율 ${formatPercent(outsiderRatio, '-')}`,
  };
}

export function normalizeHotLocalResponse(payload) {
  const source = payload?.hotLocals || payload?.regions || payload?.ranking || payload;

  if (Array.isArray(source)) {
    const [first, ...rest] = source;

    return {
      rankOne: normalizeRankOne(first),
      ranking: rest.map(normalizeRankingItem),
    };
  }

  return {
    rankOne: normalizeRankOne(source?.rankOne || source?.top1 || source?.first),
    ranking: (source?.ranking || source?.top3?.slice?.(1) || [])
      .map(normalizeRankingItem),
  };
}

export function normalizeDevVisitorHotLocalResponse(payload) {
  const regions = Array.isArray(payload?.regions) ? payload.regions : [];
  const [first, ...rest] = regions;

  return {
    rankOne: normalizeDevVisitorRegion(first, 0),
    ranking: rest.map((region, index) => normalizeDevVisitorRegion(region, index + 1)),
    weekStartDate: payload?.weekStartDate,
  };
}

export async function fetchWeeklyHotLocals({ week, limit = DEFAULT_HOT_LOCAL_LIMIT } = {}) {
  const payload = await requestApi('/api/predictions/weekly/top3', {
    method: 'GET',
    params: {
      week,
      limit,
    },
    timeoutMs: HOT_LOCAL_TIMEOUT_MS,
  });

  return normalizeHotLocalResponse(payload);
}

export async function fetchDevVisitorHotLocals({
  week = DEFAULT_DEV_VISITOR_WEEK,
  limit = DEFAULT_HOT_LOCAL_LIMIT,
  order = 'asc',
} = {}) {
  const payload = await requestApi('/api/dev/visitors', {
    method: 'GET',
    params: {
      week,
      limit,
      order,
    },
    timeoutMs: HOT_LOCAL_TIMEOUT_MS,
  });

  return normalizeDevVisitorHotLocalResponse(payload);
}
