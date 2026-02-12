import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  CustomMeal,
  CustomProduct,
  FavoriteProduct,
  MealType,
  Product,
} from "../../../models/nutrition.model";
import { useNutritionStore } from "../../../store/useNutritionStore";
import {
  canCreateCustomMeal,
  canCreateCustomProduct,
} from "../../../utils/subscriptionHelpers";
import ReusableCameraView from "../../common/components/ReusableCameraView";
import * as nutritionService from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";

const Tab = createMaterialTopTabNavigator();

const { width } = Dimensions.get("window");
const PAGE_SIZE = 100;

// Función auxiliar para obtener el color según el Nutri-Score
function getNutritionGradeColor(grade: string): string {
  const normalizedGrade = grade.toLowerCase();
  switch (normalizedGrade) {
    case "a":
      return "#038141"; // Verde oscuro
    case "b":
      return "#85BB2F"; // Verde claro
    case "c":
      return "#FECB02"; // Amarillo
    case "d":
      return "#EE8100"; // Naranja
    case "e":
      return "#E63E11"; // Rojo
    default:
      return "#999999"; // Gris por defecto
  }
}

import { GestureResponderEvent } from "react-native";

type ProductListScreenProps = NativeStackScreenProps<
  NutritionStackParamList,
  "ProductListScreen"
>;

interface TabProps {
  searchText: string;
  navigation: ProductListScreenProps["navigation"];
  selectedMeal?: MealType;
  refreshFavorites?: boolean;
}
type ProductListScreenRouteProp = RouteProp<
  NutritionStackParamList,
  "ProductListScreen"
>;

// Cache para evitar recargas innecesarias
const dataCache = {
  allProducts: null as Product[] | null,
  favorites: null as FavoriteProduct[] | null,
  customProducts: null as CustomProduct[] | null,
  customMeals: null as CustomMeal[] | null,
  lastUpdate: {
    allProducts: 0,
    favorites: 0,
    customProducts: 0,
    customMeals: 0,
  },
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Tab de Todos los Productos
// Tab de Todos los Productos (VERSIÓN CORREGIDA)
function AllProductsTab({ searchText, navigation, selectedMeal }: TabProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const userProfile = useNutritionStore((state) => state.userProfile);

  const [productos, setProductos] = useState<Product[]>([]);
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasLoadedRef = useRef(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  // Cargar productos personalizados al inicio
  useEffect(() => {
    loadCustomProducts();
  }, [userProfile]);

  const loadCustomProducts = async () => {
    if (!userProfile) return;

    try {
      const data = await nutritionService.getCustomProducts(userProfile.userId);
      setCustomProducts(data);
    } catch (error) {
      console.error("Error loading custom products:", error);
    }
  };

  // Recargar custom products cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      loadCustomProducts();
    }, [userProfile])
  );

  useEffect(() => {
    const now = Date.now();
    const cacheAge = now - dataCache.lastUpdate.allProducts;

    if (!hasLoadedRef.current || cacheAge > CACHE_DURATION) {
      loadProducts(1, true);
      hasLoadedRef.current = true;
    } else if (dataCache.allProducts) {
      setProductos(dataCache.allProducts);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.trim().length > 0) {
      setIsSearching(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchProducts(searchText, 1, true);
      }, 500);
    } else {
      setIsSearching(false);
      if (dataCache.allProducts) {
        setProductos(dataCache.allProducts);
      } else {
        loadProducts(1, true);
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText]);

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
        dataCache.allProducts = data.products;
        dataCache.lastUpdate.allProducts = Date.now();
        setHasMore(data.products.length === PAGE_SIZE);
        setPage(pageToLoad);
      } else {
        const newProducts = [...productos, ...data.products];
        setProductos(newProducts);
        dataCache.allProducts = newProducts;
        dataCache.lastUpdate.allProducts = Date.now();
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

  const searchProducts = async (
    query: string,
    pageToLoad: number,
    initial = false
  ) => {
    if (loadingMore && !initial) return;
    if (!hasMore && !initial) return;
    if (initial) setLoading(true);
    else setLoadingMore(true);

    try {
      const data = await nutritionService.searchProductsByName(
        query,
        pageToLoad,
        20
      );

      if (!data || !data.products) {
        setHasMore(false);
        setProductos([]);
        return;
      }

      if (initial) {
        setProductos(data.products);
        setHasMore(data.products.length === 20);
        setPage(pageToLoad);
      } else {
        const newProducts = [...productos, ...data.products];
        setProductos(newProducts);
        setHasMore(data.products.length === 20);
        setPage(pageToLoad);
      }
    } catch (err) {
      console.error("Error buscando productos:", err);
      setHasMore(false);
      setProductos([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
    }
  };

  const handleEndReached = () => {
    if (!loadingMore && hasMore) {
      if (isSearching && searchText.trim().length > 0) {
        searchProducts(searchText, page + 1);
      } else {
        loadProducts(page + 1);
      }
    }
  };

  // FUNCIÓN PARA CONVERTIR CustomProduct A Product
  const customProductToProduct = (customProduct: CustomProduct): Product => {
    return {
      code: customProduct.id,
      name: customProduct.name,
      image: customProduct.image ?? null,
      brand: customProduct.brand ?? null,
      grams: 100,
      calories: customProduct.caloriesPer100,
      protein: customProduct.proteinPer100,
      carbohydrates: customProduct.carbsPer100,
      fat: customProduct.fatPer100,
      categories: null,
      nutritionGrade: null,
      fiber: customProduct.fiberPer100 ?? null,
      sugar: customProduct.sugarPer100 ?? null,
      sodium: customProduct.sodiumPer100 ?? null,
      servingSize: customProduct.servingSize
        ? String(customProduct.servingSize)
        : null,
      others: [
        ...(customProduct.fiberPer100
          ? [{ label: "Fibra", value: customProduct.fiberPer100 }]
          : []),
        ...(customProduct.sugarPer100
          ? [{ label: "Azúcar", value: customProduct.sugarPer100 }]
          : []),
        ...(customProduct.sodiumPer100
          ? [{ label: "Sodio", value: customProduct.sodiumPer100 }]
          : []),
      ],
    };
  };

  // FILTRAR Y COMBINAR PRODUCTOS
  const getCombinedProducts = (): Product[] => {
    const searchLower = searchText.toLowerCase().trim();

    // Filtrar productos personalizados
    const filteredCustom = customProducts
      .filter(
        (cp) =>
          !searchLower ||
          cp.name.toLowerCase().includes(searchLower) ||
          (cp.brand && cp.brand.toLowerCase().includes(searchLower))
      )
      .map(customProductToProduct);

    // Combinar: productos personalizados primero, luego los del backend
    return [...filteredCustom, ...productos];
  };

  const allProducts = getCombinedProducts();

  const handleQuickAdd = (item: Product, event: GestureResponderEvent) => {
    event.stopPropagation();
    navigation.navigate("ProductDetailScreen", {
      producto: item,
      quickAdd: true,
      selectedMeal,
    });
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          padding: isSmallScreen ? 10 : 12,
          borderRadius: isSmallScreen ? 10 : 14,
        },
      ]}
      onPress={() =>
        navigation.navigate("ProductDetailScreen", {
          producto: item,
          selectedMeal,
        })
      }
      activeOpacity={0.8}
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
          <Image
            source={require("./../../../../assets/not-image.png")}
            style={[
              styles.productImage,
              {
                width: width * 0.12,
                height: width * 0.12,
                tintColor:
                  !item.image && isDark ? theme.textSecondary : undefined,
              },
            ]}
          />
        )}
        {/* Badge para productos personalizados */}
        {customProducts.some((cp) => cp.id === item.code) && (
          <View style={styles.customBadge}>
            <Ionicons name="create" size={14} color={theme.primary} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
        <Text
          style={[
            styles.productName,
            { fontSize: RFValue(isSmallScreen ? 12 : 14) },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.brand && (
          <Text
            style={[
              styles.productBrand,
              { fontSize: RFValue(isSmallScreen ? 9 : 11) },
            ]}
            numberOfLines={1}
          >
            {item.brand}
          </Text>
        )}
        <View style={styles.productMacros}>
          <View style={styles.macroItem}>
            <Ionicons
              name="flame"
              size={isSmallScreen ? 12 : 14}
              color="#6FCF97"
            />
            <Text
              style={[
                styles.macroText,
                { fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
            >
              {Math.round(item.calories || 0)} kcal
            </Text>
          </View>
          {item.servingSize && (
            <View style={[styles.macroItem, { marginLeft: 8 }]}>
              <Ionicons
                name="restaurant-outline"
                size={isSmallScreen ? 12 : 14}
                color="#409CFF"
              />
              <Text
                style={[
                  styles.macroText,
                  { fontSize: RFValue(isSmallScreen ? 10 : 12) },
                ]}
              >
                {item.servingSize}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.productMacros}>
          <Text
            style={[
              styles.macroText,
              { fontSize: RFValue(isSmallScreen ? 9 : 11) },
            ]}
          >
            P: {item.protein || 0}g • C: {item.carbohydrates || 0}g • F:{" "}
            {item.fat || 0}g
          </Text>
        </View>
        {item.nutritionGrade &&
          item.nutritionGrade.toLowerCase() !== "unknown" && (
            <View style={styles.nutritionGradeContainer}>
              <Text
                style={[
                  styles.nutritionGrade,
                  {
                    backgroundColor: getNutritionGradeColor(
                      item.nutritionGrade
                    ),
                  },
                ]}
              >
                {item.nutritionGrade.toUpperCase()}
              </Text>
            </View>
          )}
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={(e) => handleQuickAdd(item, e)}
      >
        <Ionicons
          name="add"
          size={isSmallScreen ? 22 : 24}
          color={theme.primary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
      data={allProducts}
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
          {searchText && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                if (canCreateCustomProduct(customProducts.length, navigation)) {
                  navigation.navigate("CreateProductScreen");
                }
              }}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Crear Producto</Text>
            </TouchableOpacity>
          )}
        </View>
      }
    />
  );
}

// Tab de Favoritos
function FavoritesTab({
  searchText,
  navigation,
  selectedMeal,
  refreshFavorites,
}: TabProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  // Efecto inicial - Cargar si no hay datos
  useEffect(() => {
    if (!hasLoadedRef.current) {
      loadFavorites();
      hasLoadedRef.current = true;
    }
  }, [userProfile]);

  useEffect(() => {
    // Solo cargar si no se ha cargado antes o si el cache está vencido
    const now = Date.now();
    const cacheAge = now - dataCache.lastUpdate.favorites;

    if (!hasLoadedRef.current || cacheAge > CACHE_DURATION) {
      loadFavorites();
      hasLoadedRef.current = true;
    } else if (dataCache.favorites) {
      // Usar datos en caché
      setFavorites(dataCache.favorites);
    }
  }, [userProfile]);

  const loadFavorites = async () => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await nutritionService.getFavorites(userProfile.userId);
      setFavorites(data);
      // No actualizamos cache timestamp para forzar recarga siempre
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recargar SIEMPRE cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [userProfile])
  );

  const handleProductPress = async (item: FavoriteProduct) => {
    // Check if productCode is a UUID (indicates data issue where favorite ID was stored instead of product code)
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.productCode
      );

    if (isUUID) {
      // Skip API call for UUIDs and use cached favorite data directly
      console.warn(
        `Favorite product has UUID as productCode (${item.productCode}), using cached data`
      );
      navigation.navigate("ProductDetailScreen", {
        producto: {
          code: item.productCode,
          name: item.productName,
          image: item.productImage ?? null,
          brand: null,
          calories: item.calories,
          protein: item.protein,
          carbohydrates: item.carbs,
          fat: item.fat,
          grams: 100,
          categories: null,
          nutritionGrade: null,
          fiber: null,
          sugar: null,
          sodium: null,
          others: [],
        },
        selectedMeal,
      });
      return;
    }

    try {
      const productDetail = await nutritionService.getProductDetail(
        item.productCode
      );
      navigation.navigate("ProductDetailScreen", {
        producto: productDetail,
        selectedMeal,
      });
    } catch (error) {
      console.error("Error obteniendo detalle del producto:", error);
      navigation.navigate("ProductDetailScreen", {
        producto: {
          code: item.productCode,
          name: item.productName,
          image: item.productImage ?? null,
          brand: null,
          calories: item.calories,
          protein: item.protein,
          carbohydrates: item.carbs,
          fat: item.fat,
          grams: 100,
          categories: null,
          nutritionGrade: null,
          fiber: null,
          sugar: null,
          sodium: null,
          others: [],
        },
        selectedMeal,
      });
    }
  };

  const filteredFavorites = favorites.filter((f) =>
    f?.productName?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }: { item: FavoriteProduct }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          padding: isSmallScreen ? 10 : 12,
          borderRadius: isSmallScreen ? 10 : 14,
        },
      ]}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.8}
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
      <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
        <Text
          style={[
            styles.productName,
            { fontSize: RFValue(isSmallScreen ? 12 : 14) },
          ]}
          numberOfLines={2}
        >
          {item.productName}
        </Text>
        <View style={styles.productMacros}>
          <View style={styles.macroItem}>
            <Ionicons
              name="flame"
              size={isSmallScreen ? 12 : 14}
              color="#6FCF97"
            />
            <Text
              style={[
                styles.macroText,
                { fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
            >
              {Math.round(item.calories) || 0} kcal
            </Text>
          </View>
          <View style={styles.macroItem}>
            <Ionicons
              name="analytics"
              size={isSmallScreen ? 12 : 14}
              color="#808080"
            />
            <Text
              style={[
                styles.macroText,
                { fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
            >
              100g
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

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
  navigation,
  route,
  selectedMeal,
}: TabProps & { route: ProductListScreenRouteProp }) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  useEffect(() => {
    // Solo cargar si no se ha cargado antes o si el cache está vencido
    const now = Date.now();
    const cacheAge = now - dataCache.lastUpdate.customProducts;

    if (!hasLoadedRef.current || cacheAge > CACHE_DURATION) {
      loadCustomProducts();
      hasLoadedRef.current = true;
    } else if (dataCache.customProducts) {
      // Usar datos en caché
      setCustomProducts(dataCache.customProducts);
    }
  }, [userProfile]);

  // Recargar cuando la pantalla recibe foco (siempre, para asegurar datos frescos)
  useFocusEffect(
    useCallback(() => {
      loadCustomProducts();
    }, [userProfile])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (route?.params?.refresh) {
        loadCustomProducts(true);
        navigation.setParams({ refresh: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route]);

  const loadCustomProducts = async (showRefreshing = false) => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await nutritionService.getCustomProducts(userProfile.userId);
      setCustomProducts(data);
      dataCache.customProducts = data;
      dataCache.lastUpdate.customProducts = Date.now();
    } catch (error) {
      console.error("Error loading custom products:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadCustomProducts(true);
  };

  const handleProductPress = (item: CustomProduct) => {
    const mappedProduct: Product = {
      code: item.id,
      name: item.name,
      image: item.image ?? null,
      brand: item.brand ?? null,
      grams: 100,
      calories: item.caloriesPer100,
      protein: item.proteinPer100,
      carbohydrates: item.carbsPer100,
      fat: item.fatPer100,
      categories: null,
      nutritionGrade: null,
      fiber: item.fiberPer100 ?? null,
      sugar: item.sugarPer100 ?? null,
      sodium: item.sodiumPer100 ?? null,
      servingSize: item.servingSize
        ? `${item.servingSize} ${item.servingUnit || "g"}`
        : null,
      others: [
        ...(item.fiberPer100
          ? [{ label: "Fibra", value: item.fiberPer100 }]
          : []),
        ...(item.sugarPer100
          ? [{ label: "Azúcar", value: item.sugarPer100 }]
          : []),
        ...(item.sodiumPer100
          ? [{ label: "Sodio", value: item.sodiumPer100 }]
          : []),
      ],
    };

    navigation.navigate("ProductDetailScreen", {
      producto: mappedProduct,
      selectedMeal,
    });
  };

  const filteredProducts = customProducts.filter((p) =>
    p?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }: { item: CustomProduct }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          padding: isSmallScreen ? 10 : 12,
          borderRadius: isSmallScreen ? 10 : 14,
        },
      ]}
      onPress={() => handleProductPress(item)}
      activeOpacity={0.8}
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
      <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
        <Text
          style={[
            styles.productName,
            { fontSize: RFValue(isSmallScreen ? 12 : 14) },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.brand && (
          <Text
            style={[
              styles.brandText,
              { fontSize: RFValue(isSmallScreen ? 9 : 11) },
            ]}
            numberOfLines={1}
          >
            {item.brand}
          </Text>
        )}
        <View style={styles.productMacros}>
          <View style={styles.macroItem}>
            <Ionicons
              name="flame"
              size={isSmallScreen ? 12 : 14}
              color="#6FCF97"
            />
            <Text
              style={[
                styles.macroText,
                { fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
            >
              {Math.round(item.caloriesPer100)} kcal
            </Text>
          </View>
          <View style={styles.macroItem}>
            <Ionicons
              name="analytics"
              size={isSmallScreen ? 12 : 14}
              color={theme.textSecondary}
            />
            <Text
              style={[
                styles.macroText,
                { fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
            >
              {item.servingSize && item.servingUnit
                ? `${item.servingSize} ${item.servingUnit}`
                : "100g"}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={(e) => {
          e.stopPropagation();
          navigation.navigate("EditProductScreen", { product: item });
        }}
      >
        <Ionicons
          name="create-outline"
          size={isSmallScreen ? 18 : 20}
          color={theme.primary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[theme.primary]}
      tintColor={theme.primary}
      progressBackgroundColor={theme.card}
    />
  );

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
          Crea productos personalizados para verlos aquí
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            if (canCreateCustomProduct(customProducts.length, navigation)) {
              navigation.navigate("CreateProductScreen");
            }
          }}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Crear Producto</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
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
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => {
          if (canCreateCustomProduct(customProducts.length, navigation)) {
            navigation.navigate("CreateProductScreen");
          }
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Tab de Comidas Personalizadas
function CustomMealsTab({
  searchText,
  navigation,
  route,
}: TabProps & { route: ProductListScreenRouteProp }) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const userProfile = useNutritionStore((state) => state.userProfile);
  const [customMeals, setCustomMeals] = useState<CustomMeal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  useEffect(() => {
    // Solo cargar si no se ha cargado antes o si el cache está vencido
    const now = Date.now();
    const cacheAge = now - dataCache.lastUpdate.customMeals;

    if (!hasLoadedRef.current || cacheAge > CACHE_DURATION) {
      loadCustomMeals();
      hasLoadedRef.current = true;
    } else if (dataCache.customMeals) {
      // Usar datos en caché
      setCustomMeals(dataCache.customMeals);
    }
  }, [userProfile]);

  // Recargar cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const cacheAge = now - dataCache.lastUpdate.customMeals;
      if (cacheAge > CACHE_DURATION) {
        loadCustomMeals();
      }
    }, [userProfile])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (route?.params?.refresh) {
        loadCustomMeals(true);
        navigation.setParams({ refresh: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route]);

  const loadCustomMeals = async (showRefreshing = false) => {
    if (!userProfile) {
      setLoading(false);
      return;
    }

    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await nutritionService.getCustomMeals(userProfile.userId);
      setCustomMeals(data);
      dataCache.customMeals = data;
      dataCache.lastUpdate.customMeals = Date.now();
    } catch (error) {
      console.error("Error loading custom meals:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadCustomMeals(true);
  };

  const handleMealPress = (item: CustomMeal) => {
    navigation.navigate("EditMealScreen", { meal: item });
  };

  const filteredMeals = customMeals.filter((m) =>
    m?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderItem = ({ item }: { item: CustomMeal }) => (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          padding: isSmallScreen ? 10 : 12,
          borderRadius: isSmallScreen ? 10 : 14,
        },
      ]}
      onPress={() => handleMealPress(item)}
      activeOpacity={0.8}
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
          <Ionicons name="restaurant" size={28} color={theme.primary} />
        )}
        <View style={styles.customBadge}>
          <Ionicons name="restaurant" size={14} color={theme.primary} />
        </View>
      </View>
      <View style={{ flex: 1, flexShrink: 1, marginRight: 8 }}>
        <Text
          style={[
            styles.productName,
            { fontSize: RFValue(isSmallScreen ? 12 : 14) },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.description && (
          <Text
            style={[
              styles.brandText,
              { fontSize: RFValue(isSmallScreen ? 9 : 11) },
            ]}
            numberOfLines={1}
          >
            {item.description}
          </Text>
        )}
        <View style={styles.productMacros}>
          <View style={styles.macroItem}>
            <Ionicons
              name="flame"
              size={isSmallScreen ? 12 : 14}
              color="#6FCF97"
            />
            <Text
              style={[
                styles.macroText,
                { fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
            >
              {Math.round(item.totalCalories)} kcal
            </Text>
          </View>
          <View style={styles.macroItem}></View>
          <View style={styles.macroItem}>
            <Ionicons
              name="fast-food"
              size={isSmallScreen ? 12 : 14}
              color={theme.primary}
            />
            <Text
              style={[
                styles.macroText,
                { fontSize: RFValue(isSmallScreen ? 10 : 12) },
              ]}
            >
              {item.products.length} items
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={(e) => {
          e.stopPropagation();
          navigation.navigate("EditMealScreen", { meal: item });
        }}
      >
        <Ionicons
          name="create-outline"
          size={isSmallScreen ? 18 : 20}
          color={theme.primary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={[theme.primary]}
      tintColor={theme.primary}
      progressBackgroundColor={theme.card}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={styles.loadingText}>
          Cargando comidas personalizadas...
        </Text>
      </View>
    );
  }

  if (customMeals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="restaurant-outline"
          size={64}
          color={theme.textTertiary}
        />
        <Text style={styles.emptyTitle}>No tienes comidas personalizadas</Text>
        <Text style={styles.emptySubtitle}>
          Crea comidas personalizadas para verlas aquí
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => {
            if (canCreateCustomMeal(customMeals.length, navigation)) {
              navigation.navigate("CreateMealScreen");
            }
          }}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Crear Comida</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMeals}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              No se encontraron comidas personalizadas
            </Text>
            <Text style={styles.emptySubtitle}>
              Intenta con otros términos de búsqueda
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => {
          if (canCreateCustomMeal(customMeals.length, navigation)) {
            navigation.navigate("CreateMealScreen");
          }
        }}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

type ProductDetailScreenRouteProp = RouteProp<
  NutritionStackParamList,
  "ProductDetailScreen"
>;

// Componente Principal
export default function ProductListScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [searchText, setSearchText] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);
  const [cameraKey, setCameraKey] = useState(0); // Key para forzar remontaje

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isMediumScreen = width < 420;

  const navigation = useNavigation<ProductListScreenProps["navigation"]>();
  const route = useRoute<ProductListScreenRouteProp>();

  const selectionMode = route.params?.selectionMode || false;
  const returnTo = route.params?.returnTo;
  const selectedMeal = route.params?.selectedMeal;

  useEffect(() => {
    if (route.params?.screen) {
      setInitialTab(route.params.screen);
      navigation.setParams({ screen: undefined });
    }
  }, [route.params?.screen]);

  const handleBarCodeScanned = async (code: string) => {
    setShowCamera(false);
    // Incrementar key para forzar remontaje la próxima vez
    setCameraKey((prev) => prev + 1);

    if (!code || code.trim().length === 0) {
      Alert.alert("Error", "Código de barras no válido");
      return;
    }

    try {
      // Buscar el producto en la base de datos
      const producto = await nutritionService.scanBarcode(code);

      if (producto && producto.code) {
        // Producto encontrado en la base de datos
        navigation.navigate("ProductDetailScreen", { producto });
      } else {
        // Producto no encontrado, crear uno nuevo directamente
        Alert.alert(
          "Producto no encontrado",
          `No se encontró el producto con código ${code} en nuestra base de datos.\n\nSerás redirigido para crear un producto personalizado.`,
          [
            {
              text: "Cancelar",
              style: "cancel",
            },
            {
              text: "Crear Producto",
              onPress: () =>
                navigation.navigate("CreateProductScreen", {
                  barcode: code,
                  selectedMeal,
                }),
              style: "default",
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("Error escaneando código:", error);

      // Si hay error, asumir que no existe y ofrecer crearlo
      Alert.alert(
        "Producto no encontrado",
        `No se pudo encontrar el producto con código ${code}.\n\n¿Deseas crear un producto personalizado?`,
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Crear Producto",
            onPress: () =>
              navigation.navigate("CreateProductScreen", {
                barcode: code,
                selectedMeal,
              }),
          },
        ]
      );
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

  if (showCamera) {
    return (
      <ReusableCameraView
        key={cameraKey}
        onBarCodeScanned={handleBarCodeScanned}
        onCloseCamera={() => {
          setShowCamera(false);
          // Incrementar key para forzar remontaje la próxima vez
          setCameraKey((prev) => prev + 1);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Global */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buscar Producto</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Barra de Búsqueda Global */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={theme.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar alimento..."
              placeholderTextColor={theme.textTertiary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setShowCamera(true)}
          >
            <Ionicons name="barcode-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Navegador de Tabs */}
        <Tab.Navigator
          initialRouteName={initialTab}
          screenOptions={{
            lazy: true, // Lazy loading activado
            lazyPreloadDistance: 1, // Pre-cargar solo el tab adyacente
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
                navigation={navigation}
                selectedMeal={selectedMeal}
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
                navigation={navigation}
                selectedMeal={selectedMeal}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Products"
            options={{
              tabBarLabel: isSmallScreen ? "Prod" : "Productos",
              tabBarIcon: ({ color }) => (
                <Ionicons name="cube" size={tabConfig.iconSize} color={color} />
              ),
            }}
          >
            {() => (
              <CustomProductsTab
                searchText={searchText}
                navigation={navigation}
                selectedMeal={selectedMeal}
                route={route}
              />
            )}
          </Tab.Screen>
          <Tab.Screen
            name="Meals"
            options={{
              tabBarLabel: "Comidas",
              tabBarIcon: ({ color }) => (
                <Ionicons
                  name="restaurant"
                  size={tabConfig.iconSize}
                  color={color}
                />
              ),
            }}
          >
            {() => (
              <CustomMealsTab
                searchText={searchText}
                navigation={navigation}
                route={route}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
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
      paddingHorizontal: 20,
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
    headerTitle: {
      fontSize: RFValue(18),
      fontWeight: "700",
      color: theme.text,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: theme.card,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    searchBar: {
      flex: 1,
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
    scanButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
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
      paddingHorizontal: 20,
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
    productImageContainer: {
      width: 60,
      height: 60,
      borderRadius: 10,
      backgroundColor: theme.background,
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
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.background,
      justifyContent: "center",
      alignItems: "center",
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
      textAlign: "center",
      paddingHorizontal: 40,
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
    floatingButton: {
      position: "absolute",
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
      elevation: 6,
      shadowColor: theme.primary,
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    createButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 16,
      gap: 8,
      elevation: 3,
      shadowColor: theme.primary,
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    createButtonText: {
      fontSize: RFValue(14),
      fontWeight: "600",
      color: "#fff",
    },
    editButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.background,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
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
      color: theme.textSecondary,
      marginBottom: 4,
    },
    productBrand: {
      fontSize: RFValue(11),
      color: theme.textSecondary,
      marginBottom: 4,
      fontStyle: "italic",
    },
    nutritionGradeContainer: {
      marginTop: 4,
    },
    nutritionGrade: {
      fontSize: RFValue(9),
      fontWeight: "700",
      color: "#fff",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      alignSelf: "flex-start",
      overflow: "hidden",
    },
  });
