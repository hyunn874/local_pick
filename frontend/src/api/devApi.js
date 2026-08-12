import { requestApi } from './apiClient';

/**
 * 개발 확인용 API. local 프로파일 백엔드에서만 동작한다.
 * 배포 전에는 사용하지 않는다.
 */

/** 주간 방문자수 순위 (외지인 기준) */
export async function fetchWeeklyVisitors(week, { limit = 20, order = 'asc' } = {}) {
  const query = `?week=${week}&limit=${limit}&order=${order}`;
  return requestApi(`/api/dev/visitors${query}`);
}

/** 서버 상태 확인 */
export async function fetchPing() {
  return requestApi('/api/ping');
}
