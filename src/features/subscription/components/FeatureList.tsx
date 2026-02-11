import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, X } from 'lucide-react-native';

interface FeatureListProps {
  features: string[];
  showLimited?: boolean;
  limitedFeatures?: string[];
}

export function FeatureList({ features, showLimited, limitedFeatures = [] }: FeatureListProps) {
  return (
    <View style={styles.container}>
      {/* Available features */}
      {features.map((feature, index) => (
        <View key={`available-${index}`} style={styles.featureRow}>
          <Check size={20} color="#10b981" style={styles.icon} />
          <Text style={styles.featureText}>{feature}</Text>
        </View>
      ))}

      {/* Limited/unavailable features */}
      {showLimited &&
        limitedFeatures.map((feature, index) => (
          <View key={`limited-${index}`} style={styles.featureRow}>
            <X size={20} color="#ef4444" style={styles.icon} />
            <Text style={[styles.featureText, styles.limitedText]}>{feature}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  icon: {
    marginRight: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  limitedText: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
});
