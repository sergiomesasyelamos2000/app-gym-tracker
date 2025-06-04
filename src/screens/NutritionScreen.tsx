import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import SectionCard from '../components/SectionCard';

export default function NutritionScreen() {
  return (
    <ScrollView className="bg-gray-50 px-4 py-6">
      <Text className="text-xl font-bold text-gray-800 mb-4">Nutrición</Text>

      <SectionCard title="Resumen de Hoy">
        <Text className="mb-1">🍽 Calorías consumidas: 1,847</Text>
        <Text className="mb-4">🔥 Calorías objetivo: 2,400</Text>
        <TouchableOpacity className="bg-green-600 px-4 py-2 rounded-full">
          <Text className="text-white text-center">Registrar Comida</Text>
        </TouchableOpacity>
      </SectionCard>

      <SectionCard title="Recomendaciones">
        <Text>🥚 Añade más proteínas en la cena</Text>
        <Text>💧 Bebe 2L de agua mínimo</Text>
      </SectionCard>
    </ScrollView>
  );
}