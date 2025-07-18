import React, { useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

export default function ProductDetailScreen({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) {
  const { producto } = route.params;
  const [quantity, setQuantity] = useState("133");
  const [unit, setUnit] = useState("gramo / ml");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [meal, setMeal] = useState("Cena");
  const [showMore, setShowMore] = useState(false);
  const [modalData, setModalData] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [modalType, setModalType] = useState<"units" | "meals" | null>(null);

  const units = [
    { label: "gramo / ml", value: "gramo / ml" },
    { label: "porción", value: "porción" },
    { label: "cup, small (125 ml)", value: "cup_small" },
    { label: "Cannette 0,33 L (330 ml)", value: "cannette" },
    { label: "Añadir porción nueva", value: "new_portion" },
  ];

  const meals = [
    { label: "Desayuno", value: "Desayuno" },
    { label: "Comida", value: "Comida" },
    { label: "Cena", value: "Cena" },
    { label: "Merienda", value: "Merienda" },
  ];

  const handleSelectUnit = (value: string) => {
    setUnit(value);
    setIsModalVisible(false); // Cerrar el modal
  };

  const handleSelectMeal = (value: string) => {
    setMeal(value);
    setIsModalVisible(false); // Cerrar el modal
  };

  if (!producto) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "red" }}>
            No se encontró información del producto.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginTop: 20 }}
          >
            <Text style={{ color: "#409CFF" }}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()} // Volver al listado de productos
          >
            <Icon name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={styles.headerIcons}>
            <Icon
              name="favorite-border"
              size={24}
              color="#000"
              style={styles.icon}
            />
            <Icon
              name="shopping-cart"
              size={24}
              color="#000"
              style={styles.icon}
            />
            <Icon name="more-vert" size={24} color="#000" style={styles.icon} />
          </View>
        </View>
        {/* Imagen del producto */}
        <Image
          source={
            producto?.image
              ? { uri: producto.image }
              : require("../../../assets/not-image.png")
          }
          style={styles.productImage}
        />
        {/* Nombre del producto */}
        <Text style={styles.productName}>{producto.name}</Text>
        {/* Valores nutricionales */}
        <View style={styles.nutritionRow}>
          <Text style={[styles.nutritionValue, { color: "#6FCF97" }]}>
            {producto.calories}
          </Text>
          <Text style={[styles.nutritionValue, { color: "#FFB74D" }]}>
            {producto.carbohydrates}
          </Text>
          <Text style={[styles.nutritionValue, { color: "#409CFF" }]}>
            {producto.protein}
          </Text>
          <Text style={[styles.nutritionValue, { color: "#FF6F61" }]}>
            {producto.fat}
          </Text>
        </View>
        <View style={styles.nutritionLabels}>
          <Text style={styles.nutritionLabel}>Calorías</Text>
          <Text style={styles.nutritionLabel}>Carbohidratos (g)</Text>
          <Text style={styles.nutritionLabel}>Proteína (g)</Text>
          <Text style={styles.nutritionLabel}>Grasa (g)</Text>
        </View>
        {/* Cantidad y unidad */}
        <View style={styles.pickerRow}>
          <TextInput
            style={styles.quantityInput}
            placeholder="Añadir cantidad..."
            value={quantity}
            onChangeText={(text) => setQuantity(text)} // Permitir edición
            keyboardType="numeric" // Mostrar teclado numérico
          />
          <TouchableOpacity
            style={styles.unitSelector}
            onPress={() => {
              setModalData(units);
              setModalType("units");
              setIsModalVisible(true);
            }}
          >
            <Text style={styles.unitText}>{unit}</Text>
          </TouchableOpacity>
        </View>
        {/* Comida */}
        <View style={styles.pickerRow}>
          <TouchableOpacity
            style={styles.mealSelector}
            onPress={() => {
              setModalData(meals);
              setModalType("meals");
              setIsModalVisible(true);
            }}
          >
            <Text style={styles.unitText}>{meal}</Text>
          </TouchableOpacity>
        </View>
        {/* Valores adicionales */}
        <View style={styles.additionalValues}>
          {(showMore
            ? producto.others ?? []
            : (producto.others ?? []).slice(0, 10)
          ).map((item: any, index: number) => (
            <View key={index} style={styles.additionalValueContainer}>
              <Text style={styles.additionalValue}>
                {item.label}: {item.value}
              </Text>
            </View>
          ))}
          <TouchableOpacity onPress={() => setShowMore(!showMore)}>
            <Text style={styles.showMore}>
              {showMore ? "Mostrar menos" : "Mostrar más"}
            </Text>
          </TouchableOpacity>
        </View>
        {/* Botón flotante */}
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>Añadir al diario</Text>
        </TouchableOpacity>
        {/* Modal para seleccionar unidad */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)} // Cerrar el modal al presionar fuera
          />
          <View style={styles.modalContainer}>
            <FlatList
              data={modalData} // Usar datos dinámicos
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    if (modalType === "units") {
                      handleSelectUnit(item.label); // Actualizar el estado de unit
                    } else if (modalType === "meals") {
                      handleSelectMeal(item.label); // Actualizar el estado de meal
                    }
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {item.label}
                    {modalType === "units" && unit === item.value ? (
                      <Text style={styles.tick}> ✓</Text> // Mostrar tick si la unidad está seleccionada
                    ) : modalType === "meals" && meal === item.value ? (
                      <Text style={styles.tick}> ✓</Text> // Mostrar tick si la comida está seleccionada
                    ) : null}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    //flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
  },
  headerIcons: {
    flexDirection: "row",
  },
  icon: {
    marginLeft: 10,
  },
  productImage: {
    width: 150,
    height: 150,
    resizeMode: "contain",
    marginBottom: 20,
    alignSelf: "center",
  },
  productName: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  nutritionLabels: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  nutritionValue: {
    width: 100, // <-- ancho fijo
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  nutritionLabel: {
    width: 100, // <-- ancho fijo
    fontSize: 12,
    color: "#808080",
    textAlign: "center",
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  quantityInput: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10, // <- separación visual
  },
  unitSelector: {
    flex: 2,
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  mealSelector: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  unitText: {
    fontSize: 16,
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    position: "absolute",
    bottom: 0,
    width: "100%",
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  tick: {
    color: "#6FCF97",
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#6FCF97",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    width: "100%",
  },
  addButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  additionalValues: {
    width: "100%",
    marginBottom: 20,
  },
  additionalValueContainer: {
    flex: 1,
    alignItems: "stretch",
    marginBottom: 10, // Espaciado entre filas
  },
  additionalValue: {
    fontSize: 14,
    color: "#808080",
    textAlign: "left",
  },
  showMore: {
    fontSize: 14,
    color: "#409CFF",
    marginTop: 10,
    textAlign: "center",
  },
});
