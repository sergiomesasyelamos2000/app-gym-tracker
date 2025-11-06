import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RFValue } from "react-native-responsive-fontsize";
import { useNavigation } from "@react-navigation/native";
import * as nutritionService from "../services/nutritionService";
import { useNutritionStore } from "../../../store/useNutritionStore";

interface ShoppingListItem {
  id: string;
  productCode: string;
  productName: string;
  productImage?: string;
  quantity: number;
  unit: string;
  purchased: boolean;
  addedAt?: Date;
}

export default function ShoppingListScreen() {
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
      setItems(
        (shoppingList as (ShoppingListItem & { addedAt?: any })[]).map(
          (item) => ({
            ...item,
            addedAt: item.addedAt ? new Date(item.addedAt) : new Date(),
          })
        )
      );
    } catch (error) {
      console.error("Error loading shopping list:", error);
      Alert.alert("Error", "Failed to load shopping list");
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
          item.id === itemId ? { ...item, purchased: updatedItem.purchased } : item
        )
      );
    } catch (error) {
      console.error("Error toggling purchased status:", error);
      Alert.alert("Error", "Failed to update item status");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await nutritionService.deleteShoppingListItem(itemId);
            setItems((prevItems) =>
              prevItems.filter((item) => item.id !== itemId)
            );
          } catch (error) {
            console.error("Error deleting item:", error);
            Alert.alert("Error", "Failed to delete item");
          }
        },
      },
    ]);
  };

  const handleClearPurchased = () => {
    if (!userProfile) {
      Alert.alert("Error", "User profile not found");
      return;
    }

    const purchasedCount = items.filter((item) => item.purchased).length;
    if (purchasedCount === 0) {
      Alert.alert("Info", "No purchased items to clear");
      return;
    }

    Alert.alert(
      "Clear Purchased Items",
      `Remove ${purchasedCount} purchased item${
        purchasedCount > 1 ? "s" : ""
      }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await nutritionService.clearPurchasedItems(userProfile.userId);
              setItems((prevItems) =>
                prevItems.filter((item) => !item.purchased)
              );
            } catch (error) {
              console.error("Error clearing purchased items:", error);
              Alert.alert("Error", "Failed to clear purchased items");
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (!userProfile) {
      Alert.alert("Error", "User profile not found");
      return;
    }

    if (items.length === 0) {
      Alert.alert("Info", "Shopping list is already empty");
      return;
    }

    Alert.alert(
      "Clear All Items",
      "Are you sure you want to clear your entire shopping list?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await nutritionService.clearShoppingList(userProfile.userId);
              setItems([]);
            } catch (error) {
              console.error("Error clearing shopping list:", error);
              Alert.alert("Error", "Failed to clear shopping list");
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
      >
        <Ionicons
          name={item.purchased ? "checkbox" : "square-outline"}
          size={RFValue(24)}
          color={item.purchased ? "#6C3BAA" : "#666"}
        />
      </TouchableOpacity>

      {item.productImage ? (
        <Image
          source={{ uri: item.productImage }}
          style={styles.productImage}
        />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]}>
          <Ionicons name="nutrition" size={RFValue(20)} color="#999" />
        </View>
      )}

      <View style={styles.itemInfo}>
        <Text
          style={[styles.productName, item.purchased && styles.purchasedText]}
          numberOfLines={2}
        >
          {item.productName}
        </Text>
        <Text style={styles.quantityText}>
          {item.quantity} {item.unit}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteItem(item.id)}
      >
        <Ionicons name="trash-outline" size={RFValue(20)} color="#E74C3C" />
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cart-outline" size={RFValue(64)} color="#CCC" />
      <Text style={styles.emptyTitle}>Your shopping list is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add products from the nutrition tracker to build your shopping list
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
          >
            <Ionicons name="arrow-back" size={RFValue(24)} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shopping List</Text>
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
        >
          <Ionicons name="arrow-back" size={RFValue(24)} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping List</Text>
        <View style={styles.headerRight} />
      </View>

      {items.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.purchased}</Text>
            <Text style={styles.statLabel}>Purchased</Text>
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
            style={[styles.actionButton, styles.clearPurchasedButton]}
            onPress={handleClearPurchased}
            disabled={stats.purchased === 0}
          >
            <Ionicons name="checkmark-done" size={RFValue(18)} color="#FFF" />
            <Text style={styles.actionButtonText}>
              Clear Purchased ({stats.purchased})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.clearAllButton]}
            onPress={handleClearAll}
          >
            <Ionicons name="trash" size={RFValue(18)} color="#FFF" />
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: RFValue(18),
    fontWeight: "600",
    color: "#333",
  },
  headerRight: {
    width: 40,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginTop: 8,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
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
    fontSize: RFValue(24),
    fontWeight: "700",
    color: "#6C3BAA",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: RFValue(12),
    color: "#666",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 12,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    padding: 4,
    marginRight: 12,
  },
  productImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: RFValue(14),
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  purchasedText: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  quantityText: {
    fontSize: RFValue(12),
    color: "#666",
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: RFValue(18),
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: RFValue(14),
    color: "#666",
    textAlign: "center",
    lineHeight: RFValue(20),
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
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  clearPurchasedButton: {
    backgroundColor: "#6C3BAA",
  },
  clearAllButton: {
    backgroundColor: "#E74C3C",
  },
  actionButtonText: {
    fontSize: RFValue(14),
    fontWeight: "600",
    color: "#FFF",
  },
});
