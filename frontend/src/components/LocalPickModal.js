import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const MAIN_GREEN = '#2D5C44';
const BACKGROUND = '#F8F6F1';
const CARD = '#FFFFFF';
const TEXT_PRIMARY = '#17251D';
const TEXT_SECONDARY = '#747B72';
const BORDER = '#E5DED4';
const ORANGE = '#F28C28';
const RED = '#C94A3A';

const toneStyles = {
  info: {
    icon: 'information-circle',
    color: MAIN_GREEN,
    backgroundColor: '#E7EFE9',
  },
  success: {
    icon: 'checkmark-circle',
    color: MAIN_GREEN,
    backgroundColor: '#E7EFE9',
  },
  error: {
    icon: 'alert-circle',
    color: RED,
    backgroundColor: '#F8E8E3',
  },
  warning: {
    icon: 'warning',
    color: ORANGE,
    backgroundColor: '#F7E9D6',
  },
};

export default function LocalPickModal({
  visible,
  tone = 'info',
  title,
  message,
  primaryText = '확인',
  secondaryText,
  onPrimaryPress,
  onSecondaryPress,
  onRequestClose,
}) {
  const currentTone = toneStyles[tone] || toneStyles.info;
  const handlePrimaryPress = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
      return;
    }

    onRequestClose?.();
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <Pressable style={styles.backdrop} onPress={onRequestClose}>
        <Pressable style={styles.card}>
          <View style={styles.logoRow}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
            <Text style={styles.logoText}>로컬픽</Text>
          </View>
          <View style={[styles.iconCircle, { backgroundColor: currentTone.backgroundColor }]}>
            <Ionicons name={currentTone.icon} size={34} color={currentTone.color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.actionRow}>
            {!!secondaryText && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                activeOpacity={0.7}
                onPress={onSecondaryPress || onRequestClose}
              >
                <Text style={styles.secondaryButtonText}>{secondaryText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              activeOpacity={0.7}
              onPress={handlePrimaryPress}
            >
              <Text style={styles.primaryButtonText}>{primaryText}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(23, 37, 29, 0.44)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: BORDER,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 18,
    padding: 24,
    shadowColor: '#101810',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.16,
    shadowRadius: 26,
    width: '100%',
  },
  logoRow: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  logo: {
    borderRadius: 8,
    height: 28,
    width: 28,
  },
  logoText: {
    color: MAIN_GREEN,
    fontSize: 16,
    fontWeight: '900',
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    marginBottom: 16,
    width: 68,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButton: {
    backgroundColor: MAIN_GREEN,
  },
  primaryButtonText: {
    color: CARD,
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: BACKGROUND,
    borderColor: BORDER,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '900',
  },
});
