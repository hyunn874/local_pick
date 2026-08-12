import { StyleSheet, Text, View } from 'react-native';

import ScreenContainer from '../components/ScreenContainer';
import { colors } from '../constants/colors';

export default function ChatRoomScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>소통방</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>동네 대화 목록</Text>
        <Text style={styles.placeholderText}>지역 기반 채팅방과 게시글 기능을 연결할 공간입니다.</Text>
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
  placeholder: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 24,
    padding: 20,
  },
  placeholderTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
