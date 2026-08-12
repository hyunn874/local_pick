import { apiClient } from './apiClient';

const REGIONS_ENDPOINT = process.env.EXPO_PUBLIC_REGIONS_ENDPOINT || '/api/regions';

function toOptionalNumber(value) {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function pickFirstValue(source, keys) {
  return keys.map((key) => source?.[key]).find((value) => value !== undefined && value !== null);
}

function extractRegionItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const candidate =
    payload.regions ||
    payload.items?.item ||
    payload.items ||
    payload.content ||
    payload.list ||
    payload.data ||
    payload.result ||
    payload.results ||
    payload.response ||
    payload.body;

  if (Array.isArray(candidate)) {
    return candidate;
  }

  return extractRegionItems(candidate);
}

export function normalizeRegion(region, index = 0) {
  const sidoName =
    pickFirstValue(region, [
      'sidoName',
      'sido',
      'province',
      'region1DepthName',
      'region_1depth_name',
    ]) || '';
  const sigunguName =
    pickFirstValue(region, [
      'sigunguName',
      'sigungu',
      'city',
      'district',
      'region2DepthName',
      'region_2depth_name',
    ]) || '';
  const fullName =
    pickFirstValue(region, ['fullName', 'displayName', 'name', 'title']) ||
    [sidoName, sigunguName].filter(Boolean).join(' ') ||
    `지역 ${index + 1}`;

  return {
    ...region,
    id: String(pickFirstValue(region, ['id', 'regionId', 'regionCode', 'code']) || fullName),
    regionCode: String(pickFirstValue(region, ['regionCode', 'code']) || ''),
    sidoName,
    sigunguName,
    fullName,
    population: toOptionalNumber(region?.population),
    areaKm2: toOptionalNumber(region?.areaKm2),
    populationDensity: toOptionalNumber(region?.populationDensity),
    centerLatitude: toOptionalNumber(
      pickFirstValue(region, ['centerLatitude', 'latitude', 'lat', 'mapY']),
    ),
    centerLongitude: toOptionalNumber(
      pickFirstValue(region, ['centerLongitude', 'longitude', 'lng', 'mapX']),
    ),
  };
}

export async function fetchRegions(params = {}) {
  const payload = await apiClient.get(REGIONS_ENDPOINT, { params });

  return extractRegionItems(payload)
    .map((region, index) => normalizeRegion(region, index))
    .filter((region) => region.fullName);
}
