import { ScrollView, View, Button, Text, StyleSheet } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";

const cardStyle = {
  backgroundColor: "#fff",
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2,
};

export default function ProgressScreen() {
  const { theme } = useTheme();
  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={cardStyle}>
        <Text>Ganar 2.3 kg</Text>
        <Text>Comenzar: 83.7 kg • Actual: 83.7 kg • Meta: 86.0 kg</Text>
        <Button title="Mostrar más" onPress={() => {}} />
      </View>
      {/* Gráfico de progreso: usa mismo CircularProgress o Svg personalizado */}
    </ScrollView>
  );
}
