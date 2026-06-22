const TOURISM_BASE_URL = 'https://apis.data.go.kr/B551011/KorService2';

export async function fetchTourismSpots(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${TOURISM_BASE_URL}/areaBasedList2?${query}`);

  if (!response.ok) {
    throw new Error('Tourism API request failed.');
  }

  return response.json();
}
