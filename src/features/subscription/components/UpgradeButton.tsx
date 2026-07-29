import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Crown } from 'lucide-react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { withOpacity } from '../../../utils/themeStyles';

interface UpgradeButtonProps {
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  feature?: string;
  style?: ViewStyle;
}

export function UpgradeButton({
  onPress,
  variant = 'primary',
  size = 'medium',
  feature,
  style,
}: UpgradeButtonProps) {
  const { theme } = useTheme();

  const variantStyles = {
    primary: {
      button: { backgroundColor: theme.warning },
      text: { color: '#FFFFFF' },
      icon: '#FFFFFF',
    },
    secondary: {
      button: { backgroundColor: withOpacity(theme.warning, 20) },
      text: { color: theme.warning },
      icon: theme.warning,
    },
    outline: {
      button: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.warning,
      },
      text: { color: theme.warning },
      icon: theme.warning,
    },
  }[variant];

  const buttonStyle = [
    styles.button,
    styles[`button_${size}`],
    variantStyles.button,
    style,
  ];

  const textStyle = [styles.text, styles[`text_${size}`], variantStyles.text];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} activeOpacity={0.7}>
      <Crown
        size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
        color={variantStyles.icon}
        style={styles.icon}
      />
      <Text style={textStyle}>
        {feature ? `Actualizar para ${feature}` : 'Actualizar a Premium'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  button_small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  button_large: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
  },
  text_small: {
    fontSize: 12,
  },
  text_medium: {
    fontSize: 14,
  },
  text_large: {
    fontSize: 16,
  },
});
