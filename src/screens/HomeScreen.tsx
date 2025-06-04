import React from 'react';
import { ScrollView, Text, View, TouchableOpacity } from 'react-native';
import SectionCard from '../components/SectionCard';
import { Flame } from 'lucide-react-native';

export default function HomeScreen() {
  return (
    <ScrollView className="bg-gray-50 px-4 py-6">
      <View className="bg-gradient-to-r from-blue-500 to-green-500 p-4 rounded-xl mb-4">
        <Text className="text-white text-xl font-bold">¡Hola, Atleta! 💪</Text>
        <Text className="text-white">Listo para otro día de progreso</Text>
      </View>

      <View className="flex-row justify-between mb-4">
        <View className="bg-green-100 p-4 rounded-xl">
          <Text className="text-xl font-bold text-green-700">12</Text>
          <Text className="text-sm">Entrenamientos</Text>
        </View>
        <View className="bg-red-100 p-4 rounded-xl">
          <Text className="text-xl font-bold text-red-700">1,847</Text>
          <Text className="text-sm">Calorías hoy</Text>
        </View>
      </View>

      <SectionCard title="Entrenamiento de Hoy">
        <Text className="mb-2">Push Day (Pecho, Hombros, Tríceps)</Text>
        <Text className="mb-4 text-gray-500">Duración estimada: 75 min</Text>
        <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-full">
          <Text className="text-white text-center">Empezar Entreno</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Acciones Rápidas">
        <Text>🍽 Registrar Comida</Text>
        <Text>📈 Ver Progreso</Text>
        <Text>⏱ Timer Rápido</Text>
      </SectionCard>
    </ScrollView>
  );
}