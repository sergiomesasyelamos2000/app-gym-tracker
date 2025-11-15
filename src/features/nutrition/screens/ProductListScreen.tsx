import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  RefreshControl,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import {
  CustomMeal,
  CustomProduct,
  FavoriteProduct,
  Product,
} from "../../../models/nutrition.model";
import { useNutritionStore } from "../../../store/useNutritionStore";
import ReusableCameraView from "../../common/components/ReusableCameraView";
import * as nutritionService from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";

const Tab = createMaterialTopTabNavigator();

const { width } = Dimensions.get("window");
const PAGE_SIZE = 100;

interface Props {
  navigation: any;
}

interface TabProps {
  searchText: string;
  navigation: any;
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
function AllProductsTab({ searchText, navigation }: TabProps) {
  const [productos, setProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasLoadedRef = useRef(false);

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  useEffect(() => {
    // Solo cargar si no se ha cargado antes o si el cache está vencido
    const now = Date.now();
    const cacheAge = now - dataCache.lastUpdate.allProducts;

    if (!hasLoadedRef.current || cacheAge > CACHE_DURATION) {
      loadProducts(1, true);
      hasLoadedRef.current = true;
    } else if (dataCache.allProducts) {
      // Usar datos en caché
      setProductos(dataCache.allProducts);
    }
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

  const handleEndReached = () => {
    if (!loadingMore && hasMore) {
      loadProducts(page + 1);
    }
  };

  const filteredProducts = productos.filter((p) =>
    p?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleQuickAdd = (item: Product, event: any) => {
    event.stopPropagation();
    navigation.navigate("ProductDetailScreen", {
      producto: item,
      quickAdd: true,
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
        navigation.navigate("ProductDetailScreen", { producto: item })
      }
      activeOpacity={0.8}
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
            <Ionicons name="flame" size={14} color="#6FCF97" />
            <Text style={styles.macroText}>{item.calories || 0} kcal</Text>
          </View>
          <View style={styles.macroItem}>
            <Ionicons name="analytics" size={14} color="#808080" />
            <Text style={styles.macroText}>{item.grams || 100}g</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={(e) => handleQuickAdd(item, e)}
      >
        <Ionicons name="add" size={24} color="#6C3BAA" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C3BAA" />
        <Text style={styles.loadingText}>Cargando productos...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredProducts}
      renderItem={renderItem}
      keyExtractor={(item) => item.code}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No se encontraron productos</Text>
          <Text style={styles.emptySubtitle}>
            {searchText
              ? `No encontramos "${searchText}"`
              : "Intenta con otros términos de búsqueda"}
          </Text>
          {searchText && (
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate("CreateProductScreen")}
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
function FavoritesTab({ searchText, navigation }: TabProps) {
  const userProfile = useNutritionStore((state) => state.userProfile);
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

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
      dataCache.favorites = data;
      dataCache.lastUpdate.favorites = Date.now();
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recargar cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const cacheAge = now - dataCache.lastUpdate.favorites;
      if (cacheAge > CACHE_DURATION) {
        loadFavorites();
      }
    }, [userProfile])
  );

  const handleProductPress = async (item: FavoriteProduct) => {
    try {
      const productDetail = await nutritionService.getProductDetail(
        item.productCode
      );
      navigation.navigate("ProductDetailScreen", { producto: productDetail });
    } catch (error) {
      console.error("Error obteniendo detalle del producto:", error);
      navigation.navigate("ProductDetailScreen", {
        producto: {
          code: item.productCode,
          name: item.productName,
          image: item.productImage,
          calories: item.calories,
          protein: item.protein,
          carbohydrates: item.carbs,
          fat: item.fat,
        },
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
            <Ionicons name="flame" size={14} color="#6FCF97" />
            <Text style={styles.macroText}>
              {Math.round(item.calories) || 0} kcal
            </Text>
          </View>
          <View style={styles.macroItem}>
            <Ionicons name="analytics" size={14} color="#808080" />
            <Text style={styles.macroText}>100g</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C3BAA" />
        <Text style={styles.loadingText}>Cargando favoritos...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No tienes favoritos</Text>
        <Text style={styles.emptySubtitle}>
          Agrega productos a tus favoritos para verlos aquí
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredFavorites}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#D1D5DB" />
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
}: TabProps & { route?: any }) {
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

  // Recargar cuando la pantalla recibe foco
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const cacheAge = now - dataCache.lastUpdate.customProducts;
      if (cacheAge > CACHE_DURATION) {
        loadCustomProducts();
      }
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
    const mappedProduct = {
      code: item.id,
      name: item.name,
      image: item.image,
      brand: item.brand,
      grams: 100,
      calories: item.caloriesPer100,
      protein: item.proteinPer100,
      carbohydrates: item.carbsPer100,
      fat: item.fatPer100,
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
      isCustomProduct: true,
      customProductId: item.id,
    };

    navigation.navigate("ProductDetailScreen", { producto: mappedProduct });
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
          <Ionicons name="cube" size={28} color="#6C3BAA" />
        )}
        <View style={styles.customBadge}>
          <Ionicons name="create" size={14} color="#6C3BAA" />
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
            <Ionicons name="flame" size={14} color="#6FCF97" />
            <Text style={styles.macroText}>
              {Math.round(item.caloriesPer100)} kcal
            </Text>
          </View>
          <View style={styles.macroItem}>
            <Ionicons name="analytics" size={14} color="#808080" />
            <Text style={styles.macroText}>100g</Text>
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
        <Ionicons name="create-outline" size={20} color="#6C3BAA" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={["#6C3BAA"]}
      tintColor="#6C3BAA"
      progressBackgroundColor="#ffffff"
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C3BAA" />
        <Text style={styles.loadingText}>
          Cargando productos personalizados...
        </Text>
      </View>
    );
  }

  if (customProducts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>
          No tienes productos personalizados
        </Text>
        <Text style={styles.emptySubtitle}>
          Crea productos personalizados para verlos aquí
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate("CreateProductScreen")}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Crear Producto</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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
        onPress={() => navigation.navigate("CreateProductScreen")}
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
}: TabProps & { route?: any }) {
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
          <Ionicons name="restaurant" size={28} color="#6C3BAA" />
        )}
        <View style={styles.customBadge}>
          <Ionicons name="restaurant" size={14} color="#6C3BAA" />
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
        {item.description && (
          <Text style={styles.brandText} numberOfLines={1}>
            {item.description}
          </Text>
        )}
        <View style={styles.productMacros}>
          <View style={styles.macroItem}>
            <Ionicons name="flame" size={14} color="#6FCF97" />
            <Text style={styles.macroText}>
              {Math.round(item.totalCalories)} kcal
            </Text>
          </View>
          <View style={styles.macroItem}>
            <Ionicons name="fast-food" size={14} color="#6C3BAA" />
            <Text style={styles.macroText}>{item.products.length} items</Text>
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
        <Ionicons name="create-outline" size={20} color="#6C3BAA" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      colors={["#6C3BAA"]}
      tintColor="#6C3BAA"
      progressBackgroundColor="#ffffff"
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C3BAA" />
        <Text style={styles.loadingText}>
          Cargando comidas personalizadas...
        </Text>
      </View>
    );
  }

  if (customMeals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No tienes comidas personalizadas</Text>
        <Text style={styles.emptySubtitle}>
          Crea comidas personalizadas para verlas aquí
        </Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate("CreateMealScreen")}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Crear Comida</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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
        onPress={() => navigation.navigate("CreateMealScreen")}
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
  const [searchText, setSearchText] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);

  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isMediumScreen = width < 420;

  const navigation =
    useNavigation<NativeStackNavigationProp<NutritionStackParamList>>();
  const route = useRoute<ProductListScreenRouteProp>();

  const selectionMode = route.params?.selectionMode || false;
  const returnTo = route.params?.returnTo;

  useEffect(() => {
    if (route.params?.screen) {
      setInitialTab(route.params.screen);
      navigation.setParams({ screen: undefined });
    }
  }, [route.params?.screen]);

  const handleBarCodeScanned = async (code: string) => {
    setShowCamera(false);
    try {
      const producto = await nutritionService.scanBarcode(code);
      if (producto) {
        navigation.navigate("ProductDetailScreen", { producto });
      }
    } catch (error) {
      console.error("Error escaneando código:", error);
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
        onBarCodeScanned={handleBarCodeScanned}
        onCloseCamera={() => setShowCamera(false)}
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
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buscar Producto</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Barra de Búsqueda Global */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#808080" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar alimento..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={20} color="#808080" />
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
            tabBarActiveTintColor: "#6C3BAA",
            tabBarInactiveTintColor: "#9CA3AF",
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
              backgroundColor: "#6C3BAA",
              height: 3,
            },
            tabBarStyle: {
              backgroundColor: "#fff",
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
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
              <AllProductsTab searchText={searchText} navigation={navigation} />
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
              <FavoritesTab searchText={searchText} navigation={navigation} />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
    color: "#1A1A1A",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: RFValue(15),
    color: "#1A1A1A",
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#6C3BAA",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: RFValue(14),
    color: "#6B7280",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
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
    color: "#1A1A1A",
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
    color: "#6B7280",
    fontWeight: "500",
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
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
    color: "#374151",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: RFValue(14),
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  favoriteBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#FFF",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
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
    backgroundColor: "#6C3BAA",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#6C3BAA",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6C3BAA",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    elevation: 3,
    shadowColor: "#6C3BAA",
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
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  customBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#FFF",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  brandText: {
    fontSize: RFValue(11),
    color: "#9CA3AF",
    marginBottom: 4,
  },
});
