import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Crown } from 'lucide-react-native';

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
  const buttonStyle = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    style,
  ];

  const textStyle = [styles.text, styles[`text_${variant}`], styles[`text_${size}`]];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} activeOpacity={0.7}>
      <Crown
        size={size === 'small' ? 16 : size === 'large' ? 24 : 20}
        color={variant === 'primary' ? '#ffffff' : '#f59e0b'}
        style={styles.icon}
      />
      <Text style={textStyle}>
        {feature ? `Upgrade for ${feature}` : 'Upgrade to Premium'}
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
  button_primary: {
    backgroundColor: '#f59e0b',
  },
  button_secondary: {
    backgroundColor: '#fef3c7',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#f59e0b',
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
  text_primary: {
    color: '#ffffff',
  },
  text_secondary: {
    color: '#92400e',
  },
  text_outline: {
    color: '#f59e0b',
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
