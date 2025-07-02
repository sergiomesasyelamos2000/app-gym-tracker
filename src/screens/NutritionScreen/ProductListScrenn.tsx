import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import ReusableCameraView from "../../components/ReusableCameraView";

interface Producto {
  id: string;
  nombre: string;
  calorias: number;
  gramos: number;
  imagen?: any;
}

const productos: Producto[] = [
  {
    id: "1",
    nombre: "Pechuga de pollo",
    calorias: 165,
    gramos: 100,
    //imagen: require("../../assets/pollo.png"),
  },
  {
    id: "2",
    nombre: "Arroz integral",
    calorias: 130,
    gramos: 100,
    //imagen: require("../../assets/arroz.png"),
  },
  {
    id: "3",
    nombre: "Brócoli",
    calorias: 34,
    gramos: 100,
    //imagen: require("../../assets/brocoli.png"),
  },
  {
    id: "4",
    nombre: "Aguacate",
    calorias: 160,
    gramos: 100,
    //imagen: require("../../assets/aguacate.png"),
  },
];

const ProductListScreen = ({ navigation }: { navigation: any }) => {
  const [searchText, setSearchText] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  const renderItem = ({ item }: { item: Producto }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("ProductDetailScreen", { id: item.id })
      } // Navegar al detalle con el id del producto
    >
      <Image source={item.imagen} style={styles.imagen} />
      <View style={styles.info}>
        <Text style={styles.nombre}>{item.nombre}</Text>
        <Text style={styles.detalle}>
          {item.calorias} kcal - {item.gramos}g
        </Text>
      </View>
      <TouchableOpacity style={styles.boton}>
        <Text style={styles.mas}>+</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (showCamera) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ReusableCameraView
          onPhotoTaken={(photo: { uri: string }) => {
            console.log("Foto tomada:", photo.uri);
            setShowCamera(false);
          }}
          onCloseCamera={() => setShowCamera(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color="#000" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar producto"
            value={searchText}
            onChangeText={setSearchText}
          />
          <TouchableOpacity
            style={styles.barcodeButton}
            onPress={() => setShowCamera(true)}
          >
            <Icon name="qr-code-scanner" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Lista de productos */}
        <FlatList
          data={productos.filter((producto) =>
            producto.nombre.toLowerCase().includes(searchText.toLowerCase())
          )}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
        />
      </View>
    </SafeAreaView>
  );
};

export default ProductListScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 16,
    color: "#333",
  },
  barcodeButton: {
    marginLeft: 10,
  },
  lista: {
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  imagen: {
    width: 50,
    height: 50,
    resizeMode: "contain",
    marginRight: 15,
  },
  info: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  detalle: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  boton: {
    backgroundColor: "#1e90ff",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  mas: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 20,
    fontWeight: "bold",
  },
});
