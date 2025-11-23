import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import { useNutritionStore } from "../../../store/useNutritionStore";
import * as nutritionService from "../services/nutritionService";

interface ShoppingListItem {
  id: string;
  productCode: string;
  productName: string;
  productImage?: string;
  purchased: boolean;
}

export default function ShoppingListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const userProfile = useNutritionStore((state) => state.userProfile);
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadShoppingList = useCallback(async () => {
    if (!userProfile) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const shoppingList = await nutritionService.getShoppingList(
        userProfile.userId
      );
      setItems(shoppingList);
    } catch (error) {
      console.error("Error loading shopping list:", error);
      Alert.alert("Error", "No se pudo cargar la lista de compras");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile]);

  useEffect(() => {
    loadShoppingList();
  }, [loadShoppingList]);

  const onRefresh = () => {
    setRefreshing(true);
    loadShoppingList();
  };

  const handleTogglePurchased = async (itemId: string) => {
    try {
      const updatedItem = await nutritionService.togglePurchased(itemId);
      setItems((prevItems) =>
        prevItems.map((item) =>
          item.id === itemId
            ? { ...item, purchased: updatedItem.purchased }
            : item
        )
      );
    } catch (error) {
      console.error("Error toggling purchased status:", error);
      Alert.alert("Error", "No se pudo actualizar el estado del producto");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert(
      "Eliminar producto",
      "¿Estás seguro de eliminar este producto?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await nutritionService.deleteShoppingListItem(itemId);
              setItems((prevItems) =>
                prevItems.filter((item) => item.id !== itemId)
              );
            } catch (error) {
              console.error("Error deleting item:", error);
              Alert.alert("Error", "No se pudo eliminar el producto");
            }
          },
        },
      ]
    );
  };

  const handleClearPurchased = () => {
    if (!userProfile) return;

    const purchasedCount = items.filter((item) => item.purchased).length;
    if (purchasedCount === 0) {
      Alert.alert("Info", "No hay productos comprados para eliminar");
      return;
    }

    Alert.alert(
      "Limpiar comprados",
      `¿Eliminar ${purchasedCount} producto${
        purchasedCount > 1 ? "s" : ""
      } comprado${purchasedCount > 1 ? "s" : ""}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar",
          style: "destructive",
          onPress: async () => {
            try {
              await nutritionService.clearPurchasedItems(userProfile.userId);
              setItems((prevItems) =>
                prevItems.filter((item) => !item.purchased)
              );
            } catch (error) {
              console.error("Error clearing purchased items:", error);
              Alert.alert(
                "Error",
                "No se pudieron eliminar los productos comprados"
              );
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (!userProfile) return;

    if (items.length === 0) {
      Alert.alert("Info", "La lista de compras ya está vacía");
      return;
    }

    Alert.alert(
      "Limpiar todo",
      "¿Estás seguro de que quieres vaciar toda la lista de compras?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpiar todo",
          style: "destructive",
          onPress: async () => {
            try {
              await nutritionService.clearShoppingList(userProfile.userId);
              setItems([]);
            } catch (error) {
              console.error("Error clearing shopping list:", error);
              Alert.alert("Error", "No se pudo vaciar la lista de compras");
            }
          },
        },
      ]
    );
  };

  const stats = {
    total: items.length,
    purchased: items.filter((item) => item.purchased).length,
    pending: items.filter((item) => !item.purchased).length,
  };

  const renderItem = ({ item }: { item: ShoppingListItem }) => (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => handleTogglePurchased(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={item.purchased ? "checkbox" : "square-outline"}
          size={RFValue(24)}
          color={item.purchased ? "#6C3BAA" : "#999"}
        />
      </TouchableOpacity>

      {item.productImage ? (
        <Image
          source={{ uri: item.productImage }}
          style={styles.productImage}
        />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]}>
          <Ionicons name="nutrition" size={RFValue(20)} color="#CCC" />
        </View>
      )}

      <View style={styles.itemInfo}>
        <Text
          style={[styles.productName, item.purchased && styles.purchasedText]}
          numberOfLines={2}
        >
          {item.productName}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={RFValue(20)} color="#E74C3C" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cart-outline" size={RFValue(64)} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>Lista de compras vacía</Text>
      <Text style={styles.emptySubtitle}>
        Agrega productos desde el rastreador nutricional para construir tu lista
        de compras
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={RFValue(20)} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lista de Compras</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C3BAA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={RFValue(20)} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lista de Compras</Text>
        <View style={styles.headerRight} />
      </View>

      {items.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#4CAF50" }]}>
              {stats.purchased}
            </Text>
            <Text style={styles.statLabel}>Comprados</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      )}

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6C3BAA"]}
            tintColor="#6C3BAA"
          />
        }
      />

      {items.length > 0 && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.clearPurchasedButton,
              stats.purchased === 0 && styles.actionButtonDisabled,
            ]}
            onPress={handleClearPurchased}
            disabled={stats.purchased === 0}
          >
            <Ionicons name="checkmark-done" size={RFValue(16)} color="#FFF" />
            <Text style={styles.actionButtonText} numberOfLines={1}>
              Limpiar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.clearAllButton]}
            onPress={handleClearAll}
          >
            <Ionicons name="trash" size={RFValue(16)} color="#FFF" />
            <Text style={styles.actionButtonText} numberOfLines={1}>
              Limpiar Todo
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: RFValue(16),
    fontWeight: "700",
    color: "#1A1A1A",
  },
  headerRight: {
    width: 32,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginTop: 12,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: RFValue(20),
    fontWeight: "700",
    color: "#6C3BAA",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: RFValue(10),
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  listContent: {
    paddingVertical: 12,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 16,
  },
  placeholderImage: {
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#1A1A1A",
    lineHeight: RFValue(18),
  },
  purchasedText: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: RFValue(18),
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: RFValue(13),
    color: "#6B7280",
    textAlign: "center",
    lineHeight: RFValue(18),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    minHeight: 50,
  },
  clearPurchasedButton: {
    backgroundColor: "#6C3BAA",
  },
  clearAllButton: {
    backgroundColor: "#E74C3C",
  },
  actionButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: RFValue(12),
    fontWeight: "700",
    color: "#FFF",
    flexShrink: 1,
  },
});
