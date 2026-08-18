import Constants from 'expo-constants';

export const KAKAO_REDIRECT_URI = 'localpick://auth/kakao';

const kakaoExtra = Constants.expoConfig?.extra?.kakao;

export const kakaoConfig = {
  restApiKey: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || kakaoExtra?.restApiKey || '',
  javascriptKey: process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY || kakaoExtra?.javascriptKey || '',
  redirectUri:
    process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI ||
    kakaoExtra?.redirectUri ||
    KAKAO_REDIRECT_URI,
};
