import * as AppleAuthentication from 'expo-apple-authentication';

export const appleLogin = async () => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    return credential;
  } catch (error) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      throw new Error('로그인이 취소됐어요');
    }
    throw error;
  }
};

export const isAppleAuthAvailable = async () => {
  return await AppleAuthentication.isAvailableAsync();
};
