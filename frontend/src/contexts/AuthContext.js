import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import apiClient from '../api/apiClient';
import {
  completeOnboarding as completeOnboardingApi,
  loginWithKakaoCode,
  refreshTokens,
} from '../api/authApi';
import { signInWithKakao } from '../api/kakaoAuthApi';

const AUTH_STORAGE_KEY = 'localpick.auth';

const DEV_USER = {
  id: 'dev-user-1',
  nickname: '유성구주민1',
  provider: 'dev',
  region: {
    code: '30200',
    sidoName: '대전광역시',
    sigunguName: '유성구',
    fullName: '대전광역시 유성구',
  },
  isResidentVerified: true,
  localPassBalance: 3,
};

const AuthContext = createContext(null);

async function readStoredAuth() {
  try {
    const value = await SecureStore.getItemAsync(AUTH_STORAGE_KEY);

    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

async function writeStoredAuth(authState) {
  try {
    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, JSON.stringify(authState));
  } catch {
    // 로그인 상태 저장 실패가 앱 사용 자체를 막지는 않도록 한다.
  }
}

async function clearStoredAuth() {
  try {
    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
  } catch {
    // 저장소 정리 실패는 다음 로그인 시 덮어쓴다.
  }
}

function assertAuthResponse(authResponse) {
  if (!authResponse?.accessToken || !authResponse?.refreshToken || !authResponse?.user) {
    throw new Error('로그인 응답을 확인할 수 없습니다.');
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const accessTokenRef = useRef(null);
  const refreshTokenRef = useRef(null);

  const syncTokenRefs = useCallback((nextAccessToken, nextRefreshToken) => {
    accessTokenRef.current = nextAccessToken ?? null;
    refreshTokenRef.current = nextRefreshToken ?? null;
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function restoreAuth() {
      const storedAuth = await readStoredAuth();

      if (!isMounted) {
        return;
      }

      if (storedAuth?.user) {
        setUser(storedAuth.user);
        setAccessToken(storedAuth.accessToken ?? null);
        setRefreshToken(storedAuth.refreshToken ?? null);
        setIsOnboarded(Boolean(storedAuth.isOnboarded));
        syncTokenRefs(storedAuth.accessToken, storedAuth.refreshToken);
      }

      setIsInitializing(false);
    }

    void restoreAuth();

    return () => {
      isMounted = false;
    };
  }, [syncTokenRefs]);

  const applyAuth = useCallback(async (nextAuthState) => {
    const normalizedAuthState = {
      accessToken: nextAuthState.accessToken ?? null,
      refreshToken: nextAuthState.refreshToken ?? null,
      provider: nextAuthState.provider ?? 'kakao',
      isNewUser: Boolean(nextAuthState.isNewUser),
      isOnboarded: Boolean(nextAuthState.isOnboarded),
      user: nextAuthState.user,
    };

    setUser(normalizedAuthState.user);
    setAccessToken(normalizedAuthState.accessToken);
    setRefreshToken(normalizedAuthState.refreshToken);
    setIsOnboarded(normalizedAuthState.isOnboarded);
    syncTokenRefs(normalizedAuthState.accessToken, normalizedAuthState.refreshToken);
    await writeStoredAuth(normalizedAuthState);

    return normalizedAuthState.user;
  }, [syncTokenRefs]);

  const clearAuthState = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsOnboarded(false);
    syncTokenRefs(null, null);
    await clearStoredAuth();
  }, [syncTokenRefs]);

  const devLogin = useCallback(() => {
    const nextAuthState = {
      accessToken: null,
      refreshToken: null,
      provider: 'dev',
      isNewUser: false,
      isOnboarded: true,
      user: DEV_USER,
    };

    return applyAuth(nextAuthState);
  }, [applyAuth]);

  const loginWithKakao = useCallback(async () => {
    const authCode = await signInWithKakao();

    if (!authCode?.code) {
      return null;
    }

    const authResponse = await loginWithKakaoCode(authCode);
    assertAuthResponse(authResponse);

    return applyAuth({
      accessToken: authResponse?.accessToken,
      refreshToken: authResponse?.refreshToken,
      isNewUser: authResponse?.isNewUser,
      isOnboarded: authResponse?.isOnboarded,
      provider: 'kakao',
      user: authResponse?.user,
    });
  }, [applyAuth]);

  const completeOnboarding = useCallback(
    async (nickname, generationTag) => {
      const nextUser = await completeOnboardingApi({ nickname, generationTag });
      const storedAuth = (await readStoredAuth()) || {};
      const nextAuthState = {
        accessToken: accessTokenRef.current,
        refreshToken: refreshTokenRef.current,
        provider: storedAuth.provider ?? 'kakao',
        isOnboarded: true,
        user: nextUser,
      };

      return applyAuth(nextAuthState);
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    await clearAuthState();
  }, [clearAuthState]);

  const handleUnauthorized = useCallback(async () => {
    const storedRefreshToken = refreshTokenRef.current;

    if (!storedRefreshToken) {
      await clearAuthState();
      return false;
    }

    try {
      const nextTokens = await refreshTokens(storedRefreshToken);
      const nextAccessToken = nextTokens?.accessToken;
      const nextRefreshToken = nextTokens?.refreshToken ?? storedRefreshToken;

      if (!nextAccessToken) {
        await clearAuthState();
        return false;
      }

      const storedAuth = (await readStoredAuth()) || {};
      const nextAuthState = {
        ...storedAuth,
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      };

      setAccessToken(nextAccessToken);
      setRefreshToken(nextRefreshToken);
      syncTokenRefs(nextAccessToken, nextRefreshToken);
      await writeStoredAuth(nextAuthState);

      return true;
    } catch {
      await clearAuthState();
      return false;
    }
  }, [clearAuthState, syncTokenRefs]);

  useEffect(() => {
    apiClient.setAuthHandlers({
      getAccessToken: () => accessTokenRef.current,
      onUnauthorized: handleUnauthorized,
    });

    return () => {
      apiClient.clearAuthHandlers();
    };
  }, [handleUnauthorized]);

  const value = useMemo(
    () => ({
      accessToken,
      refreshToken,
      user,
      isInitializing,
      isLoggedIn: Boolean(user),
      isOnboarded,
      completeOnboarding,
      devLogin,
      loginWithKakao,
      logout,
    }),
    [
      accessToken,
      completeOnboarding,
      devLogin,
      isInitializing,
      isOnboarded,
      loginWithKakao,
      logout,
      refreshToken,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return value;
}
