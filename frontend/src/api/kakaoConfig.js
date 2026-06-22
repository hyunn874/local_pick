import Constants from 'expo-constants';

const kakaoExtra = Constants.expoConfig?.extra?.kakao;

export const kakaoConfig = {
  restApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || kakaoExtra?.restApiKey || '',
  javascriptKey: kakaoExtra?.javascriptKey || '',
  redirectUri: kakaoExtra?.redirectUri || 'localpick://auth/kakao',
};
