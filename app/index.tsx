// Arcana Survival — main menu in the hand-drawn mint-ink style.

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
      <StatusBar style="dark" />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          {pic ? <Picture picture={pic} /> : null}
        </Canvas>
      </View>

      <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 16 }]}>
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
          <Text style={styles.howToLine}>• Geser jari untuk menggerakkan penyihir.</Text>
          <Text style={styles.howToLine}>• Mantera menembak otomatis — fokus bertahan hidup.</Text>
          <Text style={styles.howToLine}>• Kumpulkan orb mana, naik level, pilih mantera.</Text>
          <Text style={styles.howToLine}>• Gelombang Kematian datang di menit 6:00 — waspadai Raksasa.</Text>
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
    backgroundColor: "#63D1C1",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  titleBlock: {
    alignItems: "center",
    marginTop: 20,
  },
  titleTop: {
    color: "#101820",
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: 10,
  },
  titleBottom: {
    color: "#0E3B34",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 12,
    marginTop: 2,
  },
  tagline: {
    color: "#0E3B34",
    fontSize: 13,
    letterSpacing: 2,
    marginTop: 10,
    opacity: 0.85,
  },
  spacer: {
    flex: 1,
  },
  bestPanel: {
    alignItems: "center",
    backgroundColor: "rgba(232, 224, 201, 0.92)",
    borderColor: "#101820",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginBottom: 18,
  },
  bestTitle: {
    color: "#3A3226",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "800",
    marginBottom: 4,
  },
  bestValue: {
    color: "#1F1B16",
    fontSize: 14,
    fontWeight: "700",
  },
  playBtn: {
    backgroundColor: "#101820",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 76,
    borderColor: "#E8E0C9",
    borderWidth: 2,
  },
  playPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  playLabel: {
    color: "#E8E0C9",
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
    color: "#0E3B34",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "800",
    marginBottom: 4,
  },
  howToLine: {
    color: "#0E3B34",
    fontSize: 13,
    lineHeight: 20,
    opacity: 0.9,
  },
  version: {
    color: "#0E3B34",
    fontSize: 11,
    marginTop: 18,
    opacity: 0.7,
  },
});
