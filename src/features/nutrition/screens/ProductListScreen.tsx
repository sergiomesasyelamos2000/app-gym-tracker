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
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RFValue } from "react-native-responsive-fontsize";
import { Theme, useTheme } from "../../../contexts/ThemeContext";
import {
  themeBarStyle,
  useFocusedStatusBar,
} from "../../../hooks/useFocusedStatusBar";
import { AppRefreshControl } from "../../common/components/AppRefreshControl";
import {
  CustomMealListItemDto as CustomMealListItem,
  CustomMealResponseDto as CustomMeal,
  CustomProductResponseDto as CustomProduct,
  FavoriteProductResponseDto as FavoriteProduct,
  MealType,
  MappedProduct as Product,
} from "@sergiomesasyelamos2000/shared";
import { useNutritionStore } from "../../../store/useNutritionStore";
import { CaughtError } from "../../../types";
import {
  canCreateCustomMeal,
  canCreateCustomProduct,
} from "../../../utils/subscriptionHelpers";
import ReusableCameraView from "../../common/components/ReusableCameraView";
import { ActiveBrandFiltersRow } from "../components/product-search/ActiveBrandFiltersRow";
import { AnimatedListItem } from "../components/product-search/AnimatedListItem";
import { ProductListItem } from "../components/product-search/ProductListItem";
import { ProductListSkeleton } from "../components/product-search/ProductListSkeleton";
import { ProductSearchBar } from "../components/product-search/ProductSearchBar";
import { ProductSearchEmptyState } from "../components/product-search/ProductSearchEmptyState";
import { ProductSearchHeader } from "../components/product-search/ProductSearchHeader";
import { SearchStatusBanner } from "../components/product-search/SearchStatusBanner";
import { SwapListShell } from "../components/product-search/SwapListShell";
import { useDebouncedSwapKey } from "../components/product-search/useDebouncedSwapKey";
import * as nutritionService from "../services/nutritionService";
import { NutritionStackParamList } from "./NutritionStack";

const Tab = createMaterialTopTabNavigator();

const PAGE_SIZE = 24;
const SEARCH_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const MIN_SEARCH_CHARS = 2;

import { GestureResponderEvent } from "react-native";

type ProductListScreenProps = NativeStackScreenProps<
  NutritionStackParamList,
  "ProductListScreen"
>;

interface TabProps {
  searchText: string;
  selectedBrands: string[];
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
  customMeals: null as CustomMealListItem[] | null,
  lastUpdate: {
    allProducts: 0,
    favorites: 0,
    customProducts: 0,
    customMeals: 0,
  },
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const FALLBACK_PRODUCT_IMAGE = require("./../../../../assets/not-image.png");
const prefetchedImageUris = new Set<string>();

const prefetchImageBatch = (uris: Array<string | null | undefined>, limit = 30) => {
  let queued = 0;
  for (const rawUri of uris) {
    if (queued >= limit) break;
    const uri = rawUri?.trim();
    if (!uri || prefetchedImageUris.has(uri)) continue;
    prefetchedImageUris.add(uri);
    queued += 1;
    void Image.prefetch(uri).catch(() => {
      prefetchedImageUris.delete(uri);
    });
  }
};

const normalizeBrandFilter = (value: string) =>
  value.toLowerCase().trim().replace(/\s+/g, " ");

const matchesBrandFilters = (
  brandValue: string | null | undefined,
  selectedBrands: string[]
) => {
  if (selectedBrands.length === 0) return true;
  const normalizedBrandValue = normalizeBrandFilter(brandValue ?? "");
  return selectedBrands.some((selected) =>
    normalizedBrandValue.includes(normalizeBrandFilter(selected))
  );
};

// Tab de Todos los Productos
// Tab de Todos los Productos (VERSIÓN CORREGIDA)
function AllProductsTab({
  searchText,
  selectedBrands,
  navigation,
  selectedMeal,
}: TabProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const userProfile = useNutritionStore((state) => state.userProfile);

  const [productos, setProductos] = useState<Product[]>([]);
  const [customProducts, setCustomProducts] = useState<CustomProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBootstrappingCatalog, setIsBootstrappingCatalog] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasLoadedRef = useRef(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);
  /** Query that the list reflects (after debounce). Input can differ while typing. */
  const [committedQuery, setCommittedQuery] = useState("");
  const [listSource, setListSource] = useState<"browse" | "search">("browse");
  /** Bumped only on full list replacements (not pagination). */
  const [listSwapToken, setListSwapToken] = useState(0);
  const bumpListSwap = useCallback(() => {
    setListSwapToken((n) => n + 1);
  }, []);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRequestControllerRef = useRef<AbortController | null>(null);
  const lastTriggeredSearchRef = useRef("");
  const searchGenerationRef = useRef(0);
  const prefetchedPageRef = useRef<{
    page: number;
    products: Product[];
  } | null>(null);
  const initialEmptyRetryDoneRef = useRef(false);

  const selectedBrandsParam = useMemo(
    () => (selectedBrands.length ? selectedBrands.join(",") : undefined),
    [selectedBrands]
  );

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
      bumpListSwap();
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const normalizedSearch = searchText.replace(/\s+/g, " ").trim();

    if (normalizedSearch.length >= MIN_SEARCH_CHARS) {
      setIsSearching(true);
      if (normalizedSearch === lastTriggeredSearchRef.current) {
        return;
      }

      searchTimeoutRef.current = setTimeout(() => {
        searchProducts(normalizedSearch, 1, true);
      }, SEARCH_DEBOUNCE_MS);
    } else {
      activeRequestControllerRef.current?.abort();
      setIsSearching(false);
      setIsEnriching(false);
      setCommittedQuery("");
      setListSource("browse");
      lastTriggeredSearchRef.current = "";
      if (selectedBrands.length === 0 && dataCache.allProducts) {
        setProductos(dataCache.allProducts);
        setHasMore(dataCache.allProducts.length === PAGE_SIZE);
        setPage(1);
        bumpListSwap();
      } else {
        loadProducts(1, true);
      }
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, selectedBrands]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      activeRequestControllerRef.current?.abort();
    };
  }, []);

  const loadProducts = async (pageToLoad: number, initial = false) => {
    if (loadingMore && !initial) return;
    if (!hasMore && !initial) return;
    if (initial) setLoading(true);
    else setLoadingMore(true);

    try {
      if (initial) {
        prefetchedPageRef.current = null;
      }

      if (
        !initial &&
        prefetchedPageRef.current &&
        prefetchedPageRef.current.page === pageToLoad
      ) {
        const prefetchedProducts = prefetchedPageRef.current.products;
        const newProducts = [...productos, ...prefetchedProducts];
        setProductos(newProducts);
        dataCache.allProducts = newProducts;
        dataCache.lastUpdate.allProducts = Date.now();
        setHasMore(prefetchedProducts.length === PAGE_SIZE);
        setPage(pageToLoad);
        prefetchedPageRef.current = null;
        void prefetchProductsPage(pageToLoad + 1);
        return;
      }

      const controller = new AbortController();
      activeRequestControllerRef.current?.abort();
      activeRequestControllerRef.current = controller;

      const data = await nutritionService.getProducts(
        pageToLoad,
        PAGE_SIZE,
        selectedBrandsParam,
        controller.signal
      );

      if (!data || !data.products) {
        setHasMore(false);
        return;
      }

      if (initial) {
        if (data.products.length === 0 && !initialEmptyRetryDoneRef.current) {
          initialEmptyRetryDoneRef.current = true;
          setTimeout(() => {
            void loadProducts(1, true);
          }, 700);
          return;
        }

        setProductos(data.products);
        dataCache.allProducts = data.products;
        dataCache.lastUpdate.allProducts = Date.now();
        setHasMore(data.products.length === PAGE_SIZE);
        setPage(pageToLoad);
        setIsBootstrappingCatalog(false);
        bumpListSwap();
        void prefetchProductsPage(pageToLoad + 1);
      } else {
        const newProducts = [...productos, ...data.products];
        setProductos(newProducts);
        dataCache.allProducts = newProducts;
        dataCache.lastUpdate.allProducts = Date.now();
        setHasMore(data.products.length === PAGE_SIZE);
        setPage(pageToLoad);
        void prefetchProductsPage(pageToLoad + 1);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Error cargando productos:", err);
      setHasMore(false);
      if (initial && !initialEmptyRetryDoneRef.current) {
        initialEmptyRetryDoneRef.current = true;
        setTimeout(() => {
          void loadProducts(1, true);
        }, 900);
        return;
      }
      if (initial) {
        setIsBootstrappingCatalog(false);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const prefetchProductsPage = async (pageToPrefetch: number) => {
    if (isSearching || pageToPrefetch < 2) return;
    try {
      const data = await nutritionService.getProducts(
        pageToPrefetch,
        PAGE_SIZE,
        selectedBrandsParam
      );
      if (!data?.products?.length) {
        return;
      }
      prefetchedPageRef.current = {
        page: pageToPrefetch,
        products: data.products,
      };
    } catch {
      // Silent prefetch failure
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
      const normalizedQuery = query.replace(/\s+/g, " ").trim();
      if (normalizedQuery.length < MIN_SEARCH_CHARS) {
        setProductos([]);
        setHasMore(false);
        setIsEnriching(false);
        return;
      }

      if (initial) {
        lastTriggeredSearchRef.current = normalizedQuery;
        setCommittedQuery(normalizedQuery);
        setListSource("search");
        setProductos([]);
        setHasMore(true);
        setPage(1);
      }

      const controller = new AbortController();
      activeRequestControllerRef.current?.abort();
      activeRequestControllerRef.current = controller;
      const generation = ++searchGenerationRef.current;

      if (initial) {
        setIsEnriching(true);
        const data = await nutritionService.searchProductsProgressive(
          normalizedQuery,
          pageToLoad,
          SEARCH_PAGE_SIZE,
          selectedBrandsParam,
          controller.signal,
          (local) => {
            if (searchGenerationRef.current !== generation) return;
            const localProducts = local.products ?? [];
            // Only paint local hits when non-empty. Empty local + enriching
            // must keep the loading state (avoid flashing "no results").
            if (localProducts.length > 0) {
              setProductos(localProducts);
              setHasMore(
                localProducts.length === SEARCH_PAGE_SIZE ||
                  local.incomplete === true
              );
              setPage(pageToLoad);
              bumpListSwap();
            }
          }
        );

        if (searchGenerationRef.current !== generation) return;

        if (!data || !data.products) {
          setHasMore(false);
          setProductos([]);
          return;
        }

        setProductos(data.products);
        setHasMore(data.products.length === SEARCH_PAGE_SIZE);
        setPage(pageToLoad);
        bumpListSwap();
        return;
      }

      const data = await nutritionService.searchProductsByName(
        normalizedQuery,
        pageToLoad,
        SEARCH_PAGE_SIZE,
        selectedBrandsParam,
        false,
        controller.signal,
        "full"
      );

      if (searchGenerationRef.current !== generation) return;

      if (!data || !data.products) {
        setHasMore(false);
        return;
      }

      const newProducts = [...productos, ...data.products];
      setProductos(newProducts);
      setHasMore(data.products.length === SEARCH_PAGE_SIZE);
      setPage(pageToLoad);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      console.error("Error buscando productos:", err);
      setHasMore(false);
      if (initial) {
        setProductos([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsSearching(false);
      setIsEnriching(false);
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

  const normalizedSearchInput = useMemo(
    () => searchText.replace(/\s+/g, " ").trim(),
    [searchText]
  );

  const isSearchActive = normalizedSearchInput.length >= MIN_SEARCH_CHARS;

  const showBackendProducts = useMemo(() => {
    if (!isSearchActive) {
      return listSource === "browse";
    }
    return (
      listSource === "search" &&
      normalizedSearchInput === committedQuery &&
      committedQuery.length >= MIN_SEARCH_CHARS
    );
  }, [isSearchActive, listSource, normalizedSearchInput, committedQuery]);

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
      .filter((cp) => matchesBrandFilters(cp.brand, selectedBrands))
      .map(customProductToProduct);

    // Combinar: productos personalizados primero, luego los del backend
    // y eliminar duplicados por code (o name+brand si no hay code).
    const filteredBackend = showBackendProducts
      ? productos.filter((p) => matchesBrandFilters(p.brand, selectedBrands))
      : [];
    const combined = [...filteredCustom, ...filteredBackend];
    const deduped = new Map<string, Product>();

    for (const product of combined) {
      const key =
        product.code && product.code.trim().length > 0
          ? `code:${product.code.trim()}`
          : `name:${(product.name ?? "").trim().toLowerCase()}|brand:${(
              product.brand ?? ""
            )
              .trim()
              .toLowerCase()}`;

      if (!deduped.has(key)) {
        deduped.set(key, product);
      }
    }

    return Array.from(deduped.values());
  };

  const allProducts = useMemo(
    () => getCombinedProducts(),
    [
      customProducts,
      productos,
      searchText,
      selectedBrands,
      showBackendProducts,
    ]
  );

  type SearchUiState =
    | "idle"
    | "pending"
    | "loading"
    | "updating"
    | "empty"
    | "results";

  const searchUiState: SearchUiState = useMemo(() => {
    if (!isSearchActive) return "idle";
    if (normalizedSearchInput !== committedQuery) return "pending";
    if (loading && productos.length === 0) return "loading";
    if (isEnriching) return "updating";
    if (!loading && !isEnriching && allProducts.length === 0) return "empty";
    return "results";
  }, [
    isSearchActive,
    normalizedSearchInput,
    committedQuery,
    loading,
    productos.length,
    isEnriching,
    allProducts.length,
  ]);

  const searchStatusMessage = useMemo(() => {
    switch (searchUiState) {
      case "pending":
        return `Preparando búsqueda de «${normalizedSearchInput}»…`;
      case "loading":
        return `Buscando «${committedQuery}»…`;
      case "updating":
        return `Actualizando resultados para «${committedQuery}»…`;
      default:
        return null;
    }
  }, [searchUiState, normalizedSearchInput, committedQuery]);

  const isAwaitingSearchFeedback =
    searchUiState === "pending" ||
    searchUiState === "loading" ||
    searchUiState === "updating";

  useEffect(() => {
    prefetchImageBatch(
      allProducts.map((product) => product.image),
      24
    );
  }, [allProducts]);

  const customProductIds = useMemo(
    () => new Set(customProducts.map((cp) => cp.id)),
    [customProducts]
  );

  const handleQuickAdd = (item: Product, event: GestureResponderEvent) => {
    event.stopPropagation();
    navigation.navigate("ProductDetailScreen", {
      producto: item,
      quickAdd: true,
      selectedMeal,
    });
  };

  const renderItem = ({
    item,
    index,
    allowEntering,
  }: {
    item: Product;
    index: number;
    allowEntering: boolean;
  }) => (
    <AnimatedListItem allowEntering={allowEntering} index={index}>
      <ProductListItem
        item={item}
        isCustom={customProductIds.has(item.code)}
        onPress={() =>
          navigation.navigate("ProductDetailScreen", {
            producto: item,
            selectedMeal,
          })
        }
        onQuickAdd={(e) => handleQuickAdd(item, e)}
      />
    </AnimatedListItem>
  );

  if (
    (loading || isEnriching || searchUiState === "pending") &&
    allProducts.length === 0
  ) {
    const loadingMessage =
      searchStatusMessage ??
      (isEnriching
        ? "Buscando productos…"
        : isBootstrappingCatalog
        ? "Preparando catálogo…"
        : "Cargando productos…");

    return (
      <View style={styles.loadingContainer}>
        <ProductListSkeleton count={5} message={loadingMessage} />
      </View>
    );
  }

  return (
    <SwapListShell swapKey={`all:${listSwapToken}`}>
      {(allowRowEntering) => (
        <FlatList
          style={styles.container}
          data={allProducts}
          renderItem={({ item, index }) =>
            renderItem({ item, index, allowEntering: allowRowEntering })
          }
          keyExtractor={(item) =>
            item.code && item.code.trim().length > 0
              ? `product-${item.code.trim()}`
              : `product-${(item.name ?? "unknown").trim()}-${(
                  item.brand ?? ""
                ).trim()}`
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          initialNumToRender={12}
          windowSize={7}
          maxToRenderPerBatch={10}
          removeClippedSubviews={
            Platform.OS === "android" && !allowRowEntering
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            searchStatusMessage ? (
              <SearchStatusBanner message={searchStatusMessage} />
            ) : null
          }
          ListEmptyComponent={
            <ProductSearchEmptyState
              variant={
                isAwaitingSearchFeedback
                  ? "loading"
                  : isBootstrappingCatalog && !searchText
                  ? "bootstrap"
                  : searchText.trim().length >= MIN_SEARCH_CHARS
                  ? "empty-search"
                  : "empty-browse"
              }
              title={
                isBootstrappingCatalog && !searchText
                  ? "Preparando catálogo…"
                  : "No se encontraron productos"
              }
              subtitle={
                isAwaitingSearchFeedback
                  ? "Estamos consultando el catálogo. Los resultados aparecerán aquí en unos segundos."
                  : isBootstrappingCatalog && !searchText
                  ? "Cargando productos iniciales. Esto puede tardar unos segundos."
                  : searchText.trim().length >= MIN_SEARCH_CHARS
                  ? `Prueba otra marca, menos palabras o crea un producto propio.`
                  : "Escribe al menos 2 caracteres o explora el catálogo."
              }
              statusMessage={searchStatusMessage}
              actionLabel={
                searchText && !isAwaitingSearchFeedback
                  ? "Crear producto"
                  : undefined
              }
              onAction={
                searchText && !isAwaitingSearchFeedback
                  ? () => {
                      if (
                        canCreateCustomProduct(
                          customProducts.length,
                          navigation
                        )
                      ) {
                        navigation.navigate("CreateProductScreen");
                      }
                    }
                  : undefined
              }
            />
          }
        />
      )}
    </SwapListShell>
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

  const swapKey = useDebouncedSwapKey(
    `fav:${searchText.trim().toLowerCase()}`,
    SEARCH_DEBOUNCE_MS
  );

  useEffect(() => {
    prefetchImageBatch(
      filteredFavorites.map((favorite) => favorite.productImage),
      20
    );
  }, [filteredFavorites]);

  const favoriteToProduct = (item: FavoriteProduct): Product => ({
    code: item.productCode,
    name: item.productName,
    image: item.productImage ?? null,
    brand: null,
    grams: 100,
    calories: item.calories,
    protein: item.protein,
    carbohydrates: item.carbs,
    fat: item.fat,
    categories: null,
    nutritionGrade: null,
    fiber: null,
    sugar: null,
    sodium: null,
    servingSize: null,
    others: [],
  });

  const renderItem = ({
    item,
    index,
    allowEntering,
  }: {
    item: FavoriteProduct;
    index: number;
    allowEntering: boolean;
  }) => (
    <AnimatedListItem allowEntering={allowEntering} index={index}>
      <ProductListItem
        item={favoriteToProduct(item)}
        showFavoriteBadge
        onPress={() => handleProductPress(item)}
      />
    </AnimatedListItem>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ProductListSkeleton
          count={5}
          showTrailing={false}
          showBrand={false}
          message="Cargando favoritos…"
        />
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <ProductSearchEmptyState
        variant="empty-collection"
        icon="heart-outline"
        title="No tienes favoritos"
        subtitle="Marca productos como favoritos para encontrarlos aquí rápido."
      />
    );
  }

  return (
    <SwapListShell swapKey={swapKey}>
      {(allowRowEntering) => (
        <FlatList
          style={styles.container}
          data={filteredFavorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) =>
            renderItem({ item, index, allowEntering: allowRowEntering })
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <ProductSearchEmptyState
              variant="empty-search"
              title="No se encontraron favoritos"
              subtitle="Prueba con otro nombre o limpia la búsqueda."
            />
          }
        />
      )}
    </SwapListShell>
  );
}

// Tab de Productos Personalizados
function CustomProductsTab({
  searchText,
  selectedBrands,
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

  const customProductToListItem = (item: CustomProduct): Product => ({
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
  });

  const handleProductPress = (item: CustomProduct) => {
    navigation.navigate("ProductDetailScreen", {
      producto: customProductToListItem(item),
      selectedMeal,
    });
  };

  const filteredProducts = customProducts.filter(
    (p) =>
      p?.name?.toLowerCase().includes(searchText.toLowerCase()) &&
      matchesBrandFilters(p.brand, selectedBrands)
  );

  const swapKeyRaw = useMemo(() => {
    const brandsKey = [...selectedBrands]
      .map(normalizeBrandFilter)
      .sort()
      .join(",");
    return `cp:${searchText.trim().toLowerCase()}|${brandsKey}`;
  }, [searchText, selectedBrands]);
  const swapKey = useDebouncedSwapKey(swapKeyRaw, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    prefetchImageBatch(
      filteredProducts.map((product) => product.image),
      20
    );
  }, [filteredProducts]);

  const renderItem = ({
    item,
    index,
    allowEntering,
  }: {
    item: CustomProduct;
    index: number;
    allowEntering: boolean;
  }) => (
    <AnimatedListItem allowEntering={allowEntering} index={index}>
      <ProductListItem
        item={customProductToListItem(item)}
        isCustom
        onPress={() => handleProductPress(item)}
        trailingAction={{
          icon: "create-outline",
          accessibilityLabel: "Editar producto",
          onPress: (e) => {
            e.stopPropagation();
            navigation.navigate("EditProductScreen", { product: item });
          },
        }}
      />
    </AnimatedListItem>
  );

  const refreshControl = (
    <AppRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
  );

  const openCreateProduct = () => {
    if (canCreateCustomProduct(customProducts.length, navigation)) {
      navigation.navigate("CreateProductScreen");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ProductListSkeleton count={5} message="Cargando productos…" />
      </View>
    );
  }

  if (customProducts.length === 0) {
    return (
      <ProductSearchEmptyState
        variant="empty-collection"
        icon="cube-outline"
        title="No tienes productos personalizados"
        subtitle="Crea productos propios para verlos aquí y añadirlos a tus comidas."
        actionLabel="Crear producto"
        onAction={openCreateProduct}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SwapListShell swapKey={swapKey}>
        {(allowRowEntering) => (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) =>
              renderItem({ item, index, allowEntering: allowRowEntering })
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
            ListEmptyComponent={
              <ProductSearchEmptyState
                variant="empty-search"
                title="No se encontraron productos"
                subtitle="Prueba con otro nombre o limpia la búsqueda."
              />
            }
          />
        )}
      </SwapListShell>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={openCreateProduct}
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
  const [customMeals, setCustomMeals] = useState<CustomMealListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);

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

  const mealToListItem = (item: CustomMealListItem): Product => ({
    code: item.id,
    name: item.name,
    image: item.image ?? null,
    brand:
      item.description?.trim() ||
      `${item.productCount} alimento${item.productCount === 1 ? "" : "s"}`,
    grams: 100,
    calories: item.totalCalories,
    protein: item.totalProtein,
    carbohydrates: item.totalCarbs,
    fat: item.totalFat,
    categories: null,
    nutritionGrade: null,
    fiber: item.totalFiber ?? null,
    sugar: item.totalSugar ?? null,
    sodium: item.totalSodium ?? null,
    servingSize: null,
    others: [],
  });

  const openMealEditor = async (item: CustomMealListItem) => {
    try {
      const meal = await nutritionService.getCustomMealById(
        item.id,
        userProfile?.userId
      );
      navigation.navigate("EditMealScreen", { meal });
    } catch (error) {
      console.error("Error loading meal detail:", error);
      Alert.alert(
        "Error",
        "No se pudo cargar la comida. Inténtalo de nuevo."
      );
    }
  };

  const handleMealPress = (item: CustomMealListItem) => {
    void openMealEditor(item);
  };

  const filteredMeals = customMeals.filter((m) =>
    m?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const swapKey = useDebouncedSwapKey(
    `cm:${searchText.trim().toLowerCase()}`,
    SEARCH_DEBOUNCE_MS
  );

  useEffect(() => {
    prefetchImageBatch(
      filteredMeals.map((meal) => meal.image),
      20
    );
  }, [filteredMeals]);

  const renderItem = ({
    item,
    index,
    allowEntering,
  }: {
    item: CustomMealListItem;
    index: number;
    allowEntering: boolean;
  }) => (
    <AnimatedListItem allowEntering={allowEntering} index={index}>
      <ProductListItem
        item={mealToListItem(item)}
        isMeal
        onPress={() => handleMealPress(item)}
        trailingAction={{
          icon: "create-outline",
          accessibilityLabel: "Editar comida",
          onPress: (e) => {
            e.stopPropagation();
            void openMealEditor(item);
          },
        }}
      />
    </AnimatedListItem>
  );

  const refreshControl = (
    <AppRefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
  );

  const openCreateMeal = () => {
    if (canCreateCustomMeal(customMeals.length, navigation)) {
      navigation.navigate("CreateMealScreen");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ProductListSkeleton count={5} message="Cargando comidas…" />
      </View>
    );
  }

  if (customMeals.length === 0) {
    return (
      <ProductSearchEmptyState
        variant="empty-collection"
        icon="restaurant-outline"
        title="No tienes comidas personalizadas"
        subtitle="Agrupa productos en comidas para añadirlas rápido a tu diario."
        actionLabel="Crear comida"
        onAction={openCreateMeal}
      />
    );
  }

  return (
    <View style={styles.container}>
      <SwapListShell swapKey={swapKey}>
        {(allowRowEntering) => (
          <FlatList
            data={filteredMeals}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) =>
              renderItem({ item, index, allowEntering: allowRowEntering })
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
            ListEmptyComponent={
              <ProductSearchEmptyState
                variant="empty-search"
                title="No se encontraron comidas"
                subtitle="Prueba con otro nombre o limpia la búsqueda."
              />
            }
          />
        )}
      </SwapListShell>
      <TouchableOpacity style={styles.floatingButton} onPress={openCreateMeal}>
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
  useFocusedStatusBar(themeBarStyle(isDark));
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [showBrandFiltersModal, setShowBrandFiltersModal] = useState(false);
  const [brandSearchText, setBrandSearchText] = useState("");
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
  const brandFilters = [
    "Hacendado",
    "Mercadona",
    "Carrefour",
    "Lidl",
    "DIA",
    "Eroski",
    "Alpro",
    "Quaker",
    "Nestlé",
    "Danone",
  ];

  const clearBrandFilter = () => {
    setSelectedBrands([]);
    setBrandSearchText("");
  };

  const removeBrandFilter = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.filter(
        (value) =>
          normalizeBrandFilter(value) !== normalizeBrandFilter(brand)
      )
    );
  };

  const openBrandFiltersModal = () => {
    setBrandSearchText(selectedBrands[0] ?? "");
    setShowBrandFiltersModal(true);
  };

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
    } catch (error: CaughtError) {
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
    <SafeAreaView
      style={[
        styles.safeArea,
        Platform.OS === "android" ? { paddingTop: insets.top } : null,
      ]}
    >
      <View style={styles.container}>
        <ProductSearchHeader onBack={() => navigation.goBack()} />

        <ProductSearchBar
          value={searchText}
          onChangeText={setSearchText}
          onOpenFilters={openBrandFiltersModal}
          onOpenScanner={() => setShowCamera(true)}
          filtersActiveCount={selectedBrands.length}
        />

        <ActiveBrandFiltersRow
          brands={selectedBrands}
          onRemove={removeBrandFilter}
          onClearAll={clearBrandFilter}
        />

        <Tab.Navigator
          initialRouteName={initialTab}
          screenOptions={{
            lazy: true,
            lazyPreloadDistance: 1,
            sceneStyle: {
              backgroundColor: theme.backgroundSecondary,
            },
            tabBarActiveTintColor: theme.primary,
            tabBarInactiveTintColor: theme.textTertiary,
            tabBarLabelStyle: {
              fontSize: tabConfig.fontSize,
              fontWeight: "700",
              textTransform: "none",
              marginTop: 2,
            },
            tabBarItemStyle: {
              height: 52,
              paddingVertical: 4,
            },
            tabBarIndicatorStyle: {
              backgroundColor: theme.primary,
              height: 3,
              borderRadius: 3,
            },
            tabBarStyle: {
              backgroundColor: theme.backgroundSecondary,
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
                selectedBrands={selectedBrands}
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
                selectedBrands={selectedBrands}
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
                selectedBrands={selectedBrands}
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
                selectedBrands={selectedBrands}
                navigation={navigation}
                route={route}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </View>

      <Modal
        visible={showBrandFiltersModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBrandFiltersModal(false)}
        statusBarTranslucent={Platform.OS === "android"}
      >
        <TouchableWithoutFeedback
          onPress={() => setShowBrandFiltersModal(false)}
        >
          <View style={styles.filtersModalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.filtersModalCard}>
                <View style={styles.filtersModalHandle} />
                <View style={styles.filtersModalHeader}>
                  <Text style={styles.filtersModalTitle}>
                    Filtrar por marca
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowBrandFiltersModal(false)}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.filtersModalSubtitle}>
                  {selectedBrands.length > 0
                    ? `Marcas: ${selectedBrands.join(", ")}`
                    : "Selecciona una o varias marcas"}
                </Text>

                <View style={styles.brandSearchBar}>
                  <Ionicons
                    name="pricetag-outline"
                    size={18}
                    color={theme.textTertiary}
                  />
                  <TextInput
                    style={styles.brandSearchInput}
                    placeholder="Filtrar por marca (opcional)"
                    placeholderTextColor={theme.textTertiary}
                    value={brandSearchText}
                    onChangeText={setBrandSearchText}
                    returnKeyType="done"
                    onSubmitEditing={() => {
                      const value = brandSearchText.trim();
                      if (!value) return;
                      setSelectedBrands((prev) =>
                        prev.some(
                          (item) =>
                            normalizeBrandFilter(item) ===
                            normalizeBrandFilter(value)
                        )
                          ? prev
                          : [...prev, value]
                      );
                      setBrandSearchText("");
                    }}
                  />
                  {(brandSearchText.length > 0 ||
                    selectedBrands.length > 0) && (
                    <TouchableOpacity onPress={clearBrandFilter}>
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={theme.textTertiary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.brandChipsScroll}
                >
                  <View style={styles.brandChipsWrap}>
                    <TouchableOpacity
                      style={[
                        styles.brandChip,
                        selectedBrands.length === 0 && styles.brandChipActive,
                      ]}
                      activeOpacity={1}
                      onPress={clearBrandFilter}
                    >
                      <Text
                        style={[
                          styles.brandChipText,
                          selectedBrands.length === 0 &&
                            styles.brandChipTextActive,
                        ]}
                      >
                        Todas
                      </Text>
                    </TouchableOpacity>
                    {brandFilters.map((brand) => {
                      const isActive = selectedBrands.some(
                        (value) =>
                          normalizeBrandFilter(value) ===
                          normalizeBrandFilter(brand)
                      );
                      return (
                        <TouchableOpacity
                          key={brand}
                          style={[
                            styles.brandChip,
                            isActive && styles.brandChipActive,
                          ]}
                          activeOpacity={1}
                          onPress={() => {
                            setSelectedBrands((prev) =>
                              isActive
                                ? prev.filter(
                                    (value) =>
                                      normalizeBrandFilter(value) !==
                                      normalizeBrandFilter(brand)
                                  )
                                : [...prev, brand]
                            );
                          }}
                        >
                          <Text
                            style={[
                              styles.brandChipText,
                              isActive && styles.brandChipTextActive,
                            ]}
                          >
                            {brand}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    filtersModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    filtersModalCard: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
      height: "48%",
      minHeight: 280,
      maxHeight: 420,
      borderTopWidth: 1,
      borderColor: theme.border,
      gap: 12,
    },
    filtersModalHandle: {
      alignSelf: "center",
      width: 42,
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.border,
      marginBottom: 4,
    },
    filtersModalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    filtersModalTitle: {
      fontSize: RFValue(16),
      fontWeight: "700",
      color: theme.text,
    },
    filtersModalSubtitle: {
      fontSize: RFValue(12),
      color: theme.textSecondary,
    },
    brandSearchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 40,
      gap: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.border,
    },
    brandSearchInput: {
      flex: 1,
      fontSize: RFValue(13),
      color: theme.text,
    },
    brandChipsScroll: {
      paddingBottom: 6,
    },
    brandChipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    brandChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.border,
    },
    brandChipActive: {
      backgroundColor: `${theme.primary}20`,
      borderColor: theme.primary,
    },
    brandChipText: {
      fontSize: RFValue(11),
      color: theme.textSecondary,
      fontWeight: "600",
    },
    brandChipTextActive: {
      color: theme.primary,
      fontWeight: "700",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "flex-start",
      alignItems: "stretch",
      backgroundColor: theme.background,
      width: "100%",
    },
    loadingText: {
      marginTop: 12,
      fontSize: RFValue(14),
      color: theme.textSecondary,
      textAlign: "center",
      paddingHorizontal: 24,
    },
    searchStatusBanner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      marginBottom: 8,
      borderRadius: 10,
      backgroundColor: isDark ? `${theme.primary}18` : `${theme.primary}12`,
      borderWidth: 1,
      borderColor: isDark ? `${theme.primary}40` : `${theme.primary}25`,
    },
    searchStatusText: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: RFValue(13),
      fontWeight: "500",
    },
    listContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 24,
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
