import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { RFValue } from 'react-native-responsive-fontsize';
import { Ionicons } from '@expo/vector-icons';
import { getProducts, scanBarcode } from '../services/nutritionService';
import ReusableCameraView from '../../common/components/ReusableCameraView';
import { Product } from '../../../models/nutrition.model';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 100;

interface Props {
  navigation: any;
}

export default function ProductListScreen({ navigation }: Props) {
  const [searchText, setSearchText] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [productos, setProductos] = useState<Product[]>([]);
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

      if (!data || !data.products) {
        console.error('Respuesta inválida del servidor:', data);
        setHasMore(false);
        return;
      }

      if (initial) {
        setProductos(data.products);
        setHasMore(data.products.length === PAGE_SIZE);
        setPage(pageToLoad);
        if (data.products.length === PAGE_SIZE) {
          preloadAllProducts(pageToLoad + 1);
        }
      } else {
        setProductos((prev) => [...prev, ...data.products]);
        setHasMore(data.products.length === PAGE_SIZE);
        setPage(pageToLoad);
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const preloadAllProducts = async (startPage: number) => {
    let currentPage = startPage;
    let keepLoading = true;
    let maxPages = 5;

    while (keepLoading && maxPages > 0) {
      try {
        const data = await getProducts(currentPage, PAGE_SIZE);

        if (!data || !data.products) {
          keepLoading = false;
          break;
        }

        if (data.products.length > 0) {
          setProductos((prev) => [...prev, ...data.products]);
        }

        if (data.products.length < PAGE_SIZE) {
          keepLoading = false;
        } else {
          currentPage++;
          maxPages--;
        }
      } catch (err) {
        keepLoading = false;
        console.error('Error precargando productos:', err);
      }
    }
  };

  const handleEndReached = () => {
    if (!loadingMore && hasMore) {
      loadProducts(page + 1);
    }
  };

  const handleBarCodeScanned = async (code: string) => {
    setShowCamera(false);
    try {
      const producto = await scanBarcode(code);

      if (producto) {
        navigation.navigate('ProductDetailScreen', {
          producto: producto,
        });
      } else {
        console.error('Producto no encontrado');
      }
    } catch (error) {
      console.error('Error escaneando código:', error);
    }
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() =>
        navigation.navigate('ProductDetailScreen', {
          producto: item,
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.productImageContainer}>
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require('./../../../../assets/not-image.png')
          }
          style={styles.productImage}
        />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
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
      <View style={styles.addButton}>
        <Ionicons name="add" size={24} color="#6C3BAA" />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No se encontraron productos</Text>
      <Text style={styles.emptySubtitle}>
        Intenta con otro término de búsqueda
      </Text>
    </View>
  );

  if (showCamera) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ReusableCameraView
          onBarCodeScanned={handleBarCodeScanned}
          onCloseCamera={() => setShowCamera(false)}
        />
      </SafeAreaView>
    );
  }

  const filteredProducts = productos.filter((producto) =>
    producto?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
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

        {/* Search Bar */}
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
              <TouchableOpacity onPress={() => setSearchText('')}>
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

        {/* Results Count */}
        {!loading && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* Product List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C3BAA" />
            <Text style={styles.loadingText}>Cargando productos...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderItem}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.listContent}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#6C3BAA" />
                  <Text style={styles.loadingMoreText}>Cargando más productos...</Text>
                </View>
              ) : null
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: RFValue(18),
    fontWeight: '700',
    color: '#1A1A1A',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: RFValue(15),
    color: '#1A1A1A',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6C3BAA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsCount: {
    fontSize: RFValue(13),
    color: '#6B7280',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: RFValue(14),
    color: '#6B7280',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  productImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: RFValue(14),
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  productMacros: {
    flexDirection: 'row',
    gap: 16,
  },
  macroItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  macroText: {
    fontSize: RFValue(12),
    color: '#6B7280',
    fontWeight: '500',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: RFValue(16),
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: RFValue(14),
    color: '#9CA3AF',
    marginTop: 8,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  loadingMoreText: {
    fontSize: RFValue(13),
    color: '#6B7280',
  },
});
