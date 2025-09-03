import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import Icon from "react-native-vector-icons/MaterialIcons";
import ExerciseSetRow from "./ExerciseSetRow";
import { SetRequestDto } from "../../../../models";

interface Props {
  sets: SetRequestDto[];
  onUpdate: (
    id: string,
    field: keyof SetRequestDto,
    value: number | boolean
  ) => void;
  onDelete: (id: string) => void;
}

const ExerciseSetList = ({ sets, onUpdate, onDelete }: Props) => {
  const renderRightActions = (itemId: string) => (
    <View style={styles.actionsContainer}>
      <Icon
        name="delete"
        size={24}
        color="#F44336"
        onPress={() => onDelete(itemId)}
      />
    </View>
  );

  return (
    <>
      <View style={styles.columnTitles}>
        <Text style={[styles.columnTitle, { flex: 1 }]}>Serie</Text>
        <Text style={[styles.columnTitle, { flex: 2 }]}>Peso</Text>
        <Text style={[styles.columnTitle, { flex: 2 }]}>Reps</Text>
        <Text style={[styles.columnTitle, { flex: 1 }]}>✔</Text>
      </View>

      <GestureHandlerRootView>
        <FlatList
          data={sets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <ExerciseSetRow item={item} onUpdate={onUpdate} />
            </Swipeable>
          )}
        />
      </GestureHandlerRootView>
    </>
  );
};

const styles = StyleSheet.create({
  columnTitles: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  columnTitle: {
    fontWeight: "600",
    fontSize: 14,
    color: "#777",
    textAlign: "center",
  },
  actionsContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
  },
});

export default ExerciseSetList;
