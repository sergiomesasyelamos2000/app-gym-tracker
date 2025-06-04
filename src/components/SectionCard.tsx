import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useTailwind } from 'tailwind-rn';

interface Props {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function SectionCard({ title, children, className = '' }: Props) {
  const tw = useTailwind();
  return (
    <View style={tw(`bg-white rounded-2xl p-4 mb-4 shadow ${className}`)}>
      <Text style={tw("text-lg font-semibold mb-2 text-gray-800")}>{title}</Text>
      {children}
    </View>
  );
}