import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronRight } from 'lucide-react-native';
import { WorkoutStackParamList } from './WorkoutStack';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type WorkoutScreenNavigationProp = NativeStackNavigationProp<WorkoutStackParamList, 'WorkoutList'>;

const routines = [
  {
    id: 1,
    name: 'Chest and Triceps',
    description: 'Bench Press (Barbell), Chest Fly (Machine), Triceps Pushdown...',
  },
  {
    id: 2,
    name: 'Back and Biceps',
    description: 'Bent Over Row, Lat Pulldown, Cable Row...',
  },
];

export default function WorkoutScreen() {
  const navigation = useNavigation<WorkoutScreenNavigationProp>();

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4">
      <Text className="text-xl font-bold mb-4">Routines</Text>
      {routines.map((routine) => (
        <TouchableOpacity
          key={routine.id}
          className="bg-blue-100 rounded-xl p-4 mb-4 flex-row justify-between items-center"
          onPress={() => navigation.navigate('RoutineDetail', { routine })}
        >
          <View>
            <Text className="text-lg font-semibold text-blue-700">{routine.name}</Text>
            <Text className="text-gray-600">{routine.description}</Text>
          </View>
          <ChevronRight color="#3B82F6" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
