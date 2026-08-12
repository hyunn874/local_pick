import { useCallback, useState } from 'react';

import { signInWithKakao } from '../api/kakaoAuthApi';

export function useKakaoLogin() {
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async () => {
    setIsLoading(true);

    try {
      return await signInWithKakao();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    login,
  };
}
