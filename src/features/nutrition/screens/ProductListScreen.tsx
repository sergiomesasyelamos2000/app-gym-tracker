import React, { useState, useEffect } from "react";
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
import { getProducts, scanBarcode } from "../services/nutritionService";
import ReusableCameraView from "../../common/components/ReusableCameraView";

interface Producto {
  code: string;
  name: string;
  calories: number;
  grams: number;
  image?: any;
}

const PAGE_SIZE = 100;

const ProductListScreen = ({ navigation }: { navigation: any }) => {
  const [searchText, setSearchText] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadProducts(1, true);
  }, []);

  const loadProducts = async (pageToLoad: number, initial = false) => {
    if (loadingMore && !initial) return;
    if (!hasMore && !initial) return;
    if (initial) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await getProducts(pageToLoad, PAGE_SIZE);
      if (initial) {
        setProductos(data);
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageToLoad);
        // Preload next pages in background
        preloadAllProducts(pageToLoad + 1);
      } else {
        setProductos((prev) => [...prev, ...data]);
        setHasMore(data.length === PAGE_SIZE);
        setPage(pageToLoad);
      }
    } catch (err) {
      console.error("Error cargando productos:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Precarga todas las páginas siguientes en segundo plano
  const preloadAllProducts = async (startPage: number) => {
    let currentPage = startPage;
    let keepLoading = true;
    while (keepLoading) {
      try {
        const data = await getProducts(currentPage, PAGE_SIZE);
        if (data.length > 0) {
          setProductos((prev) => [...prev, ...data]);
        }
        if (data.length < PAGE_SIZE) {
          keepLoading = false;
        } else {
          currentPage++;
        }
      } catch (err) {
        keepLoading = false;
        console.error("Error precargando productos:", err);
      }
    }
  };

  const handleEndReached = () => {
    if (!loadingMore && hasMore) {
      loadProducts(page + 1);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("ProductDetailScreen", {
          producto: item,
        })
      }
    >
      <Image
        source={
          item.image
            ? { uri: item.image }
            : require("./../../../../assets/not-image.png")
        }
        style={styles.image}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.detalle}>
          {item.calories} kcal - {item.grams}g
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
          onBarCodeScanned={async (code: string) => {
            setShowCamera(false);
            const producto = await scanBarcode(code);

            if (producto) {
              navigation.navigate("ProductDetailScreen", {
                producto: producto,
              });
            } else {
              console.error("Producto no encontrado");
            }
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
        {loading ? (
          <Text style={{ textAlign: "center", marginTop: 40 }}>
            Cargando productos...
          </Text>
        ) : (
          <FlatList
            data={productos.filter((producto) =>
              producto?.name?.toLowerCase().includes(searchText.toLowerCase())
            )}
            renderItem={renderItem}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.lista}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <Text style={{ textAlign: "center", marginVertical: 10 }}>
                  Cargando más...
                </Text>
              ) : null
            }
          />
        )}
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
  image: {
    width: 50,
    height: 50,
    resizeMode: "contain",
    marginRight: 15,
  },
  info: {
    flex: 1,
  },
  name: {
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
