import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import SectionCard from '../components/SectionCard';

export default function WorkoutScreen() {
  return (
    <ScrollView className="bg-gray-50 px-4 py-6">
      <Text className="text-xl font-bold text-gray-800 mb-4">Entreno de Hoy</Text>

      <SectionCard title="Push Day (Pecho, Hombros, Tríceps)">
        <Text className="mb-1">• Press Banca - 4x10</Text>
        <Text className="mb-1">• Elevaciones Laterales - 3x12</Text>
        <Text className="mb-4">• Fondos - 3x8</Text>
        <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-full">
          <Text className="text-white text-center">Comenzar Entreno</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Entrenamientos Recientes">
        <Text>✅ Pull Day - Ayer</Text>
        <Text>✅ Pierna - Martes</Text>
      </SectionCard>
    </ScrollView>
  );
}