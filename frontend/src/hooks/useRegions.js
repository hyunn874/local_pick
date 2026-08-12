import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRegions } from '../api/regionsApi';

const EMPTY_PARAMS = {};

export function useRegions(options = {}) {
  const { enabled = true, params = EMPTY_PARAMS } = options;
  const requestIdRef = useRef(0);
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));

  const refetch = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    setError(null);

    try {
      const nextRegions = await fetchRegions(params);

      if (requestIdRef.current === requestId) {
        setRegions(nextRegions);
      }

      return nextRegions;
    } catch (nextError) {
      if (requestIdRef.current === requestId) {
        setRegions([]);
        setError(nextError);
      }

      return [];
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [params]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    void refetch();
  }, [enabled, refetch]);

  return {
    regions,
    error,
    isLoading,
    refetch,
    count: regions.length,
  };
}

export default useRegions;
