// Arcana Survival — main menu.

import { Canvas, Picture } from "@shopify/react-native-skia";
import type { SkPicture } from "@shopify/react-native-skia";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buildMenuPicture } from "@/components/game/render";
import { formatTime } from "@/components/game/engine";
import { loadBest } from "@/components/game/storage";
import type { BestRecord } from "@/components/game/storage";

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pic, setPic] = useState<SkPicture | null>(null);
  const [best, setBest] = useState<BestRecord | null>(null);

  useEffect(() => {
    void loadBest().then(setBest);
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setPic(buildMenuPicture(width, height));
  }, []);

  const play = useCallback(() => {
    router.push("/game");
  }, [router]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <StatusBar style="light" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          {pic ? <Picture picture={pic} /> : null}
        </Canvas>
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.titleBlock}>
          <Text style={styles.titleTop}>ARCANA</Text>
          <Text style={styles.titleBottom}>SURVIVAL</Text>
          <Text style={styles.tagline}>Bertahan. Melawan. Menyihir.</Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.bestPanel}>
          <Text style={styles.bestTitle}>REKOR TERTINGGI</Text>
          {best ? (
            <Text style={styles.bestValue}>
              {best.score} skor • {formatTime(best.time)} • {best.kills} kill • Lv.{best.level}
            </Text>
          ) : (
            <Text style={styles.bestValue}>Belum ada rekor — jadilah yang pertama.</Text>
          )}
        </View>

        <Pressable onPress={play} style={({ pressed }) => [styles.playBtn, pressed && styles.playPressed]}>
          <Text style={styles.playLabel}>MAIN</Text>
        </Pressable>

        <View style={styles.howTo}>
          <Text style={styles.howToTitle}>CARA MAIN</Text>
          <Text style={styles.howToLine}>• Geser jari di layar untuk menggerakkan penyihir.</Text>
          <Text style={styles.howToLine}>• Mantera menembak otomatis — fokus bertahan hidup.</Text>
          <Text style={styles.howToLine}>• Kumpulkan kristal XP, naik level, pilih penguatan.</Text>
        </View>

        <Text style={styles.version}>
          v{Constants.expoConfig?.version ?? "1.0.0"} • dibuat dengan Manus
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0A14",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  titleBlock: {
    alignItems: "center",
    marginTop: 26,
  },
  titleTop: {
    color: "#EDE9FE",
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 10,
    textShadowColor: "#7C3AED",
    textShadowRadius: 24,
  },
  titleBottom: {
    color: "#5EEAD4",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 12,
    marginTop: 2,
    textShadowColor: "#14B8A6",
    textShadowRadius: 16,
  },
  tagline: {
    color: "#8B85B0",
    fontSize: 13,
    letterSpacing: 2,
    marginTop: 10,
  },
  spacer: {
    flex: 1,
  },
  bestPanel: {
    alignItems: "center",
    backgroundColor: "rgba(21, 18, 40, 0.8)",
    borderColor: "#3B2F63",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 18,
  },
  bestTitle: {
    color: "#A5A0C8",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: 4,
  },
  bestValue: {
    color: "#E5E0F5",
    fontSize: 14,
    fontWeight: "600",
  },
  playBtn: {
    backgroundColor: "#7C3AED",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 74,
    shadowColor: "#7C3AED",
    shadowOpacity: 0.6,
    shadowRadius: 22,
  },
  playPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  playLabel: {
    color: "#F5F3FF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 6,
  },
  howTo: {
    marginTop: 22,
    gap: 4,
    alignItems: "flex-start",
  },
  howToTitle: {
    color: "#A5A0C8",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: 4,
  },
  howToLine: {
    color: "#8B85B0",
    fontSize: 13,
    lineHeight: 20,
  },
  version: {
    color: "#575380",
    fontSize: 11,
    marginTop: 18,
  },
});
