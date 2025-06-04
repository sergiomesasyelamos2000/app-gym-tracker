import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import SectionCard from '../components/SectionCard';

export default function ProgressScreen() {
  return (
    <ScrollView className="bg-gray-50 px-4 py-6">
      <Text className="text-xl font-bold text-gray-800 mb-4">Tu Progreso</Text>

      <SectionCard title="Últimos 7 días">
        <Text className="mb-1">📅 Entrenos: 5</Text>
        <Text className="mb-1">🔥 Calorías promedio: 2,150</Text>
        <Text>⚖️ Peso actual: 78 kg</Text>
      </SectionCard>

      <SectionCard title="Objetivo Actual">
        <Text className="mb-2">🎯 Ganar masa muscular</Text>
        <Text className="text-gray-500">Meta semanal: 4 entrenos / 2,400 kcal diarias</Text>
      </SectionCard>
    </ScrollView>
  );
}