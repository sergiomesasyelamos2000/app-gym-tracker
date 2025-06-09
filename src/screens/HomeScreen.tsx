import React from "react";
import { ScrollView, Text, View } from "react-native";

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
    </ScrollView>
  );
}
