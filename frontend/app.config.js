const fs = require('fs');
const path = require('path');

const baseConfig = {
  name: 'LocalPick',
  slug: 'localpick',
  version: '1.0.2',
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1E3A2F',
  },
  userInterfaceStyle: 'light',
  ios: {
    icon: './assets/icon.png',
    supportsTablet: false,
    bundleIdentifier: 'com.localpick.app',
    buildNumber: '17',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: '거주자 인증을 위해 위치 정보가 필요해요.',
    },
  },
  android: {
    package: 'com.localpick.app',
    versionCode: 1,
    icon: './assets/icon.png',
    adaptiveIcon: {
      backgroundColor: '#2D5C44',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  scheme: 'localpick',
  extra: {
    kakao: {
      restApiKey: '',
      redirectUri: 'localpick://auth/kakao',
    },
    naver: {
      mapClientId: '',
    },
  },
  plugins: [
    'expo-web-browser',
    'expo-secure-store',
    'expo-asset',
    'expo-font',
    'expo-apple-authentication',
    'expo-build-properties',
  ],
};

function readDotEnv() {
  const envPath = path.join(__dirname, '.env');

  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(envPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

const localEnv = readDotEnv();
const naverMapClientId =
  process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ||
  localEnv.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID ||
  baseConfig.extra?.naver?.mapClientId ||
  '';

const basePlugins = (baseConfig.plugins || []).filter((plugin) => {
  const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
  return ![
    '@mj-studio/react-native-naver-map',
    'expo-build-properties',
  ].includes(pluginName);
});

const nativeMapPlugins = naverMapClientId
  ? [
      [
        '@mj-studio/react-native-naver-map',
        {
          client_id: naverMapClientId,
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            extraMavenRepos: ['https://repository.map.naver.com/archive/maven'],
          },
        },
      ],
    ]
  : [];

module.exports = {
  ...baseConfig,
  extra: {
    ...baseConfig.extra,
    eas: {
      projectId: 'd41ea5d8-3591-4f3e-bb2a-e4a5bfa3f136',
    },
    naver: {
      ...baseConfig.extra?.naver,
      mapClientId: naverMapClientId,
    },
  },
  plugins: [
    ...basePlugins,
    ...nativeMapPlugins,
  ],
};
