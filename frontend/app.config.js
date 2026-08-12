const KAKAO_LOGIN_PLUGIN = '@react-native-seoul/kakao-login';

module.exports = ({ config }) => {
  const plugins = (config.plugins || []).filter((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;

    return pluginName !== KAKAO_LOGIN_PLUGIN;
  });

  return {
    ...config,
    plugins: [
      ...plugins,
      [
        KAKAO_LOGIN_PLUGIN,
        {
          kakaoAppKey: process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY || '',
        },
      ],
    ],
  };
};
