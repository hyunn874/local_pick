import { StyleSheet, Text, View } from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import { colors } from '../constants/colors';

export default function LocalPassScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>내 로컬패스</Text>
      <View style={styles.passCard}>
        <Text style={styles.passName}>LocalPick Pass</Text>
        <Text style={styles.passDescription}>가입한 지역 혜택과 이용권 정보를 표시할 공간입니다.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  passCard: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    gap: 10,
    marginTop: 24,
    padding: 20,
  },
  passName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  passDescription: {
    color: '#EAF7F1',
    fontSize: 14,
    lineHeight: 20,
  },
});
