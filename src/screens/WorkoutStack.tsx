import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WorkoutScreen from '../screens/WorkoutScreen';
import RoutineDetailScreen from './RoutineDetailScreen';

export type WorkoutStackParamList = {
  WorkoutList: undefined;
  RoutineDetail: { routine: { id: number; name: string; description: string } };
};


const Stack = createNativeStackNavigator<WorkoutStackParamList>();



export default function WorkoutStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="WorkoutList" component={WorkoutScreen} options={{ title: 'Workout' }} />
      <Stack.Screen name="RoutineDetail" component={RoutineDetailScreen} options={{ title: 'Routine Detail' }} />
    </Stack.Navigator>
  );
}
