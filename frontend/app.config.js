const fs = require('fs');
const path = require('path');

const baseConfig = require('./app.json').expo;

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
