import Constants from 'expo-constants';

export function getNaverMapClientId() {
  return (
    process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ||
    process.env.NAVER_MAP_CLIENT_ID ||
    Constants.expoConfig?.extra?.naver?.mapClientId ||
    Constants.manifest?.extra?.naver?.mapClientId ||
    ''
  );
}

export function maskNaverMapClientId(clientId) {
  if (!clientId) {
    return 'missing';
  }

  if (clientId.length <= 8) {
    return `${clientId.slice(0, 2)}***`;
  }

  return `${clientId.slice(0, 4)}...${clientId.slice(-4)}`;
}
