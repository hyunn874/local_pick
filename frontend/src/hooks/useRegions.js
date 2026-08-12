import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchRegions } from '../api/regionApi';

/**
 * 백엔드에서 행정구역 목록을 불러온다.
 * 지도 페이지의 지역 선택(시도 → 시군구) 흐름에 사용한다.
 */
export function useRegions(initialSido) {
  const [regions, setRegions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (sido) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchRegions(sido);
      setRegions(data ?? []);
    } catch (err) {
      setError(err.message);
      setRegions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(initialSido);
  }, [load, initialSido]);

  /** 시도 목록 (중복 제거, 등장 순서 유지) */
  const sidoList = useMemo(() => {
    const seen = new Set();
    const result = [];

    regions.forEach((region) => {
      if (!seen.has(region.sidoName)) {
        seen.add(region.sidoName);
        result.push(region.sidoName);
      }
    });

    return result;
  }, [regions]);

  return {
    regions,
    sidoList,
    isLoading,
    error,
    reload: load,
  };
}
