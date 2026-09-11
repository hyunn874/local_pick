import { requestApi } from './apiClient';

function formatDistance(distanceMeters) {
  const distance = Number(distanceMeters);

  if (!Number.isFinite(distance)) {
    return '거리 정보 없음';
  }

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`;
  }

  return `${Math.round(distance)}m`;
}

function normalizeNearbyAttraction(item, index) {
  const contentId = item?.contentId ?? item?.id;
  const title = item?.title || '연관 관광지';
  const category = item?.category || '관광지';
  const distanceLabel = formatDistance(item?.distanceMeters);
  const address = item?.address || '';

  return {
    id: String(contentId || `${title}-${index}`),
    contentId,
    title,
    category,
    address,
    distanceMeters: Number(item?.distanceMeters ?? 0),
    distanceLabel,
    imageUrl: item?.imageUrl || item?.thumbnailUrl || null,
    longitude: Number(item?.longitude),
    latitude: Number(item?.latitude),
    tel: item?.tel || '',
    meta: address ? `${distanceLabel} · ${address}` : distanceLabel,
  };
}

export async function fetchNearbyAttractions({
  latitude,
  longitude,
  radius = 5000,
  limit = 5,
}) {
  const data = await requestApi('/api/attractions/nearby', {
    params: {
      lat: latitude,
      lng: longitude,
      radius,
      limit,
    },
    skipAuth: true,
  });

  return Array.isArray(data) ? data.map(normalizeNearbyAttraction) : [];
}
