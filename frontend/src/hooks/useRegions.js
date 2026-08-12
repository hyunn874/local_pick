import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchRegions } from '../api/regionApi';

function resolveOptions(initialSidoOrOptions) {
  if (initialSidoOrOptions && typeof initialSidoOrOptions === 'object') {
    return {
      enabled: initialSidoOrOptions.enabled ?? true,
      initialSido: initialSidoOrOptions.sido,
    };
  }

  return {
    enabled: true,
    initialSido: initialSidoOrOptions,
  };
}

/**
 * 백엔드에서 행정구역 목록을 불러온다.
 * 지도 페이지의 지역 선택(시도 -> 시군구) 흐름에 사용한다.
 */
export function useRegions(initialSidoOrOptions) {
  const { enabled, initialSido } = resolveOptions(initialSidoOrOptions);
  const requestIdRef = useRef(0);
  const [regions, setRegions] = useState([]);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [error, setError] = useState(null);

  const load = useCallback(async (sido = initialSido) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchRegions(sido);
      const nextRegions = data ?? [];

      if (requestIdRef.current === requestId) {
        setRegions(nextRegions);
      }

      return nextRegions;
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err.message);
        setRegions([]);
      }

      return [];
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [initialSido]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void load(initialSido);
  }, [enabled, initialSido, load]);

  const sidoList = useMemo(() => {
    const seen = new Set();
    const result = [];

    regions.forEach((region) => {
      if (region.sidoName && !seen.has(region.sidoName)) {
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
    refetch: load,
    count: regions.length,
  };
}

export default useRegions;
