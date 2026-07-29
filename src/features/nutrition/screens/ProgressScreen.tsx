import { Button, ScrollView, Text, View } from "react-native";
import { useTheme } from "../../../contexts/ThemeContext";

export default function ProgressScreen() {
  const { theme } = useTheme();
  const cardStyle = {
    backgroundColor: theme.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.border,
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      style={{ backgroundColor: theme.background }}
    >
      <View style={cardStyle}>
        <Text style={{ color: theme.text }}>Ganar 2.3 kg</Text>
        <Text style={{ color: theme.textSecondary }}>
          Comenzar: 83.7 kg • Actual: 83.7 kg • Meta: 86.0 kg
        </Text>
        <Button title="Mostrar más" onPress={() => {}} />
      </View>
      {/* Gráfico de progreso: usa mismo CircularProgress o Svg personalizado */}
    </ScrollView>
  );
}
