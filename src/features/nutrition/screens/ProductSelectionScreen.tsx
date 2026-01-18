import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  CustomMeal,
  CustomProduct,
  FavoriteProduct,
  Product,
} from "../../../models/nutrition.model";
import { useNutritionStore } from "../../../store/useNutritionStore";
import * as nutritionService from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";

const Tab = createMaterialTopTabNavigator();
const PAGE_SIZE = 100;

type ProductSelectionScreenRouteProp = RouteProp<
  NutritionStackParamList,
  "ProductSelectionScreen"
>;

interface TabProps {
  searchText: string;
  selectedProducts: Set<string>;
  onToggleProduct: (
    product: Product | CustomProduct | CustomMeal,
    isSelected: boolean,
  ) => void;
}

// Tab de Todos los Productos
function AllProductsTab({
  searchText,
  selectedProducts,
  onToggleProduct,
}: TabProps) {
  const { theme, isDark } = useTheme();
  const [productos, setProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark],
  );

  useEffect(() => {
    loadProducts(1, true);
  }, []);

  const loadProducts = async (pageToLoad: number, initial = false) => {
    if (loadingMore && !initial) return;
    if (!hasMore && !initial) return;
    if (initial) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await nutritionService.getProducts(pageToLoad, PAGE_SIZE);

      if (!data || !data.products) {
        setHasMore(false);
        return;
      }

      if (initial) {
        setProductos(data.products);
        setHasMore(data.products.length === PAGE_SIZE);
        setPage(pageToLoad);
      } else {
        setProductos((prev) => [...prev, ...data.products]);
        setHasMore(data.products.length === PAGE_SIZE);
        setPage(pageToLoad);
      }
    } catch (err) {
      console.error("Error cargando productos:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleEndReached = () => {
    if (!loadingMore && hasMore) {
      loadProducts(page + 1);
    }
  };

  const filteredProducts = productos.filter((p) =>
    p?.name?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderItem = ({ item }: { item: Product }) => {
    const isSelected = selectedProducts.has(item.code);

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          {
            padding: isSmallScreen ? 10 : 12,
            borderRadius: isSmallScreen ? 10 : 14,
          },
          isSelected && styles.productCardSelected,
        ]}
        onPress={() => onToggleProduct(item, isSelected)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.productImageContainer,
            { width: width * 0.15, height: width * 0.15 },
          ]}
        >
          <Image
            source={
              item.image
                ? { uri: item.image }
                : require("./../../../../assets/not-image.png")
            }
            style={[
              styles.productImage,
              { width: width * 0.12, height: width * 0.12 },
            ]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.productName,
              { fontSize: RFValue(isSmallScreen ? 13 : 14) },
            ]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          <View style={styles.productMacros}>
            <View style={styles.macroItem}>
              <Ionicons name="flame" size={14} color={theme.success} />
              <Text style={styles.macroText}>{item.calories || 0} kcal</Text>
            </View>
            <View style={styles.macroItem}>
              <Ionicons
                name="analytics"
                size={14}
                color={theme.textSecondary}
              />
              <Text style={styles.macroText}>{item.grams || 100}g</Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.checkboxContainer,
            isSelected && styles.checkboxContainerSelected,
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={20} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={filteredProducts}
      renderItem={renderItem}
      keyExtractor={(item) => item.code}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={64}
            color={theme.textTertiary}
          />
          <Text style={styles.emptyTitle}>No se encontraron productos</Text>
          <Text style={styles.emptySubtitle}>
            {searchText
              ? `No encontramos "${searchText}"`
              : "Intenta con otros términos de búsqueda"}
          </Text>
        </View>
      }
    />
  );
}

// Tab de Favoritos
function FavoritesTab({
  searchText,
  selectedProducts,
  onToggleProduct,
}: TabProps) {
  const { theme, isDark } = useTheme();
  const userProfile = useNutritionStore((state) => state.userProfile);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark],
  );

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [userProfile]),
  );

  const loadFavorites = async () => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await nutritionService.getFavorites(userProfile.userId);
      setFavorites(data);
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFavorites = favorites.filter((f) =>
    f?.productName?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderItem = ({ item }: { item: FavoriteProduct }) => {
    const isSelected = selectedProducts.has(item.productCode);

    // Convertir FavoriteProduct a Product para onToggleProduct
    const product: Product = {
      code: item.productCode,
      name: item.productName,
      image: item.productImage || null,
      calories: item.calories,
      protein: item.protein,
      carbohydrates: item.carbs,
      fat: item.fat,
      grams: 100,
      others: [], // Campo requerido añadido
      isCustomProduct: false, // Campo opcional
    };

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          {
            padding: isSmallScreen ? 10 : 12,
            borderRadius: isSmallScreen ? 10 : 14,
          },
          isSelected && styles.productCardSelected,
        ]}
        onPress={() => onToggleProduct(product, isSelected)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.productImageContainer,
            { width: width * 0.15, height: width * 0.15 },
          ]}
        >
          {item.productImage ? (
            <Image
              source={{ uri: item.productImage }}
              style={[
                styles.productImage,
                { width: width * 0.12, height: width * 0.12 },
              ]}
            />
          ) : (
            <Image
              source={require("./../../../../assets/not-image.png")}
              style={[
                styles.productImage,
                { width: width * 0.12, height: width * 0.12 },
              ]}
            />
          )}
          <View style={styles.favoriteBadge}>
            <Ionicons name="heart" size={16} color="#E94560" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.productName,
              { fontSize: RFValue(isSmallScreen ? 13 : 14) },
            ]}
            numberOfLines={2}
          >
            {item.productName}
          </Text>
          <View style={styles.productMacros}>
            <View style={styles.macroItem}>
              <Ionicons name="flame" size={14} color={theme.success} />
              <Text style={styles.macroText}>
                {Math.round(item.calories) || 0} kcal
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Ionicons
                name="analytics"
                size={14}
                color={theme.textSecondary}
              />
              <Text style={styles.macroText}>100g</Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.checkboxContainer,
            isSelected && styles.checkboxContainerSelected,
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={20} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>Cargando favoritos...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={64} color={theme.textTertiary} />
        <Text style={styles.emptyTitle}>No tienes favoritos</Text>
        <Text style={styles.emptySubtitle}>
          Agrega productos a tus favoritos para verlos aquí
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={filteredFavorites}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons
            name="search-outline"
            size={64}
            color={theme.textTertiary}
          />
          <Text style={styles.emptyTitle}>No se encontraron favoritos</Text>
          <Text style={styles.emptySubtitle}>
            Intenta con otros términos de búsqueda
          </Text>
        </View>
      }
    />
  );
}

// Tab de Productos Personalizados
function CustomProductsTab({
  searchText,
  selectedProducts,
  onToggleProduct,
}: TabProps) {
  const { theme, isDark } = useTheme();
  const userProfile = useNutritionStore((state) => state.userProfile);
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark],
  );

  useFocusEffect(
    useCallback(() => {
      loadCustomProducts();
    }, [userProfile]),
  );

  const loadCustomProducts = async () => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await nutritionService.getCustomProducts(userProfile.userId);
      setCustomProducts(data);
    } catch (error) {
      console.error("Error loading custom products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = customProducts.filter((p) =>
    p?.name?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderItem = ({ item }: { item: CustomProduct }) => {
    const isSelected = selectedProducts.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          {
            padding: isSmallScreen ? 10 : 12,
            borderRadius: isSmallScreen ? 10 : 14,
          },
          isSelected && styles.productCardSelected,
        ]}
        onPress={() => onToggleProduct(item, isSelected)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.productImageContainer,
            { width: width * 0.15, height: width * 0.15 },
          ]}
        >
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={[
                styles.productImage,
                { width: width * 0.12, height: width * 0.12 },
              ]}
            />
          ) : (
            <Ionicons name="cube" size={28} color={theme.primary} />
          )}
          <View style={styles.customBadge}>
            <Ionicons name="create" size={14} color={theme.primary} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.productName,
              { fontSize: RFValue(isSmallScreen ? 13 : 14) },
            ]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
          {item.brand && (
            <Text style={styles.brandText} numberOfLines={1}>
              {item.brand}
            </Text>
          )}
          <View style={styles.productMacros}>
            <View style={styles.macroItem}>
              <Ionicons name="flame" size={14} color={theme.success} />
              <Text style={styles.macroText}>
                {Math.round(item.caloriesPer100)} kcal
              </Text>
            </View>
            <View style={styles.macroItem}>
              <Ionicons
                name="analytics"
                size={14}
                color={theme.textSecondary}
              />
              <Text style={styles.macroText}>100g</Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.checkboxContainer,
            isSelected && styles.checkboxContainerSelected,
          ]}
        >
          {isSelected && <Ionicons name="checkmark" size={20} color="#FFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>
          Cargando productos personalizados...
        </Text>
      </View>
    );
  }

  if (customProducts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color={theme.textTertiary} />
        <Text style={styles.emptyTitle}>
          No tienes productos personalizados
        </Text>
        <Text style={styles.emptySubtitle}>
          Crea productos personalizados en la lista principal
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={filteredProducts}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>
            No se encontraron productos personalizados
          </Text>
          <Text style={styles.emptySubtitle}>
            Intenta con otros términos de búsqueda
          </Text>
        </View>
      }
    />
  );
}

// Componente Principal
export default function ProductSelectionScreen() {
  const { theme, isDark } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<NutritionStackParamList>>();
  const route = useRoute<ProductSelectionScreenRouteProp>();

  const [searchText, setSearchText] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<
    Map<string, Product | CustomProduct | CustomMeal>
  >(new Map());

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isMediumScreen = width < 420;

  const styles = React.useMemo(
    () => createStyles(theme, isDark),
    [theme, isDark],
  );

  // Determinar de dónde viene la navegación
  const sourceScreen = route.params?.from; // 'CreateMealScreen' o 'EditMealScreen'

  const handleToggleProduct = (
    product: Product | CustomProduct | CustomMeal,
    isSelected: boolean,
  ) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev);
      const productId =
        "code" in product ? product.code : "id" in product ? product.id : "";

      if (isSelected) {
        newMap.delete(productId);
      } else {
        newMap.set(productId, product);
      }
      return newMap;
    });
  };

  // Reemplaza esta sección en handleConfirm:
  const handleConfirm = () => {
    if (selectedProducts.size === 0) {
      Alert.alert("Sin Productos", "Por favor selecciona al menos un producto");
      return;
    }

    const productsArray = Array.from(selectedProducts.values());

    // Navegar de vuelta a la pantalla correcta según de dónde venga
    if (sourceScreen === "EditMealScreen") {
      if (route.params?.meal) {
        navigation.navigate("EditMealScreen", {
          meal: route.params.meal, // Pasar la comida original
          selectedProducts: productsArray,
        });
      } else {
        // Fallback: si no hay meal, navegar a CreateMealScreen
        console.warn(
          "No se encontró la comida para editar, redirigiendo a creación",
        );
        navigation.navigate("CreateMealScreen", {
          selectedProducts: productsArray,
        });
      }
    } else {
      // Por defecto, o si viene de CreateMealScreen
      navigation.navigate("CreateMealScreen", {
        selectedProducts: productsArray,
        draftName: route.params?.draftName,
        draftDescription: route.params?.draftDescription,
        draftImageUri: route.params?.draftImageUri,
      });
    }
  };

  const getTabConfig = () => {
    const fontSize = isSmallScreen ? 10 : isMediumScreen ? 11 : 12;
    const iconSize = isSmallScreen ? 18 : isMediumScreen ? 20 : 22;

    return {
      fontSize,
      iconSize,
    };
  };

  const tabConfig = getTabConfig();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Seleccionar Productos</Text>
            <Text style={styles.headerSubtitle}>
              {selectedProducts.size} seleccionado
              {selectedProducts.size !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              selectedProducts.size === 0 && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selectedProducts.size === 0}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.confirmButtonText,
                selectedProducts.size === 0 && styles.confirmButtonTextDisabled,
              ]}
            >
              Añadir
            </Text>
          </TouchableOpacity>
        </View>

        {/* Barra de Búsqueda */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar productos..."
              placeholderTextColor={theme.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Navegador de Tabs */}
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: theme.textTertiary,
            tabBarLabelStyle: {
              fontSize: tabConfig.fontSize,
              fontWeight: "600",
              textTransform: "none",
              marginTop: 2,
            },
            tabBarItemStyle: {
              height: 56,
              paddingVertical: 4,
            },
            tabBarIndicatorStyle: {
              backgroundColor: theme.primary,
              height: 3,
            },
            tabBarStyle: {
              backgroundColor: theme.card,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            },
            tabBarScrollEnabled: false,
          }}
        >
          <Tab.Screen
            name="All"
            options={{
              tabBarLabel: "Todos",
              tabBarIcon: ({ color }) => (
                <Ionicons name="grid" size={tabConfig.iconSize} color={color} />
              ),
            }}
          >
            {() => (
              <AllProductsTab
                searchText={searchText}
                selectedProducts={new Set(selectedProducts.keys())}
                onToggleProduct={handleToggleProduct}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Favorites"
            options={{
              tabBarLabel: isSmallScreen ? "Favs" : "Favoritos",
              tabBarIcon: ({ color }) => (
                <Ionicons
                  name="heart"
                  size={tabConfig.iconSize}
                  color={color}
                />
              ),
            }}
          >
            {() => (
              <FavoritesTab
                searchText={searchText}
                selectedProducts={new Set(selectedProducts.keys())}
                onToggleProduct={handleToggleProduct}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Custom"
            options={{
              tabBarLabel: isSmallScreen ? "Pers." : "Personalizados",
              tabBarIcon: ({ color }) => (
                <Ionicons name="cube" size={tabConfig.iconSize} color={color} />
              ),
            }}
          >
            {() => (
              <CustomProductsTab
                searchText={searchText}
                selectedProducts={new Set(selectedProducts.keys())}
                onToggleProduct={handleToggleProduct}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerButton: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    headerCenter: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 16,
    },
    headerTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
    },
    headerSubtitle: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
      marginTop: 2,
    },
    confirmButton: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      backgroundColor: theme.primary,
      borderRadius: 20,
    },
    confirmButtonDisabled: {
      backgroundColor: theme.border,
    },
    confirmButtonText: {
      fontSize: RFValue(14),
      fontWeight: "600",
      color: "#FFF",
    },
    confirmButtonTextDisabled: {
      color: theme.textTertiary,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 48,
      gap: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.border,
    },
    searchInput: {
      flex: 1,
      fontSize: RFValue(15),
      color: theme.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: RFValue(14),
      color: theme.textSecondary,
    },
    listContent: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    productCard: {
      flexDirection: "row",
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 12,
      alignItems: "center",
      marginBottom: 12,
      elevation: 2,
      shadowColor: theme.shadowColor,
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.border,
    },
    productCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.backgroundSecondary,
    },
    productImageContainer: {
      width: 60,
      height: 60,
      borderRadius: 10,
      backgroundColor: theme.backgroundSecondary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    productImage: {
      width: 50,
      height: 50,
      resizeMode: "contain",
    },
    productName: {
      fontSize: RFValue(14),
      fontWeight: "600",
      color: theme.text,
      marginBottom: 6,
    },
    productMacros: {
      flexDirection: "row",
      gap: 16,
    },
    macroItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    macroText: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    checkboxContainer: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.card,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 12,
    },
    checkboxContainerSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: RFValue(16),
      fontWeight: "600",
      color: theme.text,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: RFValue(14),
      color: theme.textSecondary,
      marginTop: 8,
      textAlign: "center",
      paddingHorizontal: 40,
    },
    favoriteBadge: {
      position: "absolute",
      top: 2,
      right: 2,
      backgroundColor: theme.card,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.shadowColor,
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    customBadge: {
      position: "absolute",
      top: 2,
      right: 2,
      backgroundColor: theme.card,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: theme.shadowColor,
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    brandText: {
      fontSize: RFValue(11),
      color: theme.textTertiary,
      marginBottom: 4,
    },
  });
