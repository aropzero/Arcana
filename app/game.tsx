// Arcana Survival — game route.

import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";

import GameScreen from "@/components/game/GameScreen";

export default function GameRoute() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <GameScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0A14",
  },
});
