const TOURISM_BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';
const TOURISM_API_KEY = process.env.EXPO_PUBLIC_TOURISM_API_KEY || '';

export async function fetchTourismSpots(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${TOURISM_BASE_URL}/areaBasedList2?${query}`);

  if (!response.ok) {
    throw new Error('Tourism API request failed.');
  }

  return response.json();
}

export async function fetchNearbySpots(latitude, longitude, radius = 5000) {
  const query = new URLSearchParams({
    mapX: String(longitude),
    mapY: String(latitude),
    radius: String(radius),
    MobileOS: 'ETC',
    MobileApp: 'LocalPick',
    _type: 'json',
    serviceKey: TOURISM_API_KEY,
  }).toString();

  const response = await fetch(`${TOURISM_BASE_URL}/locationBasedList2?${query}`);

  if (!response.ok) {
    throw new Error('Tourism API request failed.');
  }

  const data = await response.json();
  const items = data?.response?.body?.items?.item;

  if (!items) {
    return [];
  }

  return Array.isArray(items) ? items : [items];
}
