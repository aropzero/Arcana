// Arcana Survival — in-game HUD: HP, XP, wave, timer, kills, score, pause.

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatTime } from "./engine";

interface HudProps {
  hud: {
    hp: number;
    maxHp: number;
    xp: number;
    xpNext: number;
    level: number;
    wave: number;
    time: number;
    kills: number;
    score: number;
  };
  onPause: () => void;
}

export function Hud({ hud, onPause }: HudProps) {
  const insets = useSafeAreaInsets();
  const hpPct = Math.max(0, Math.min(1, hud.hp / hud.maxHp)) * 100;
  const xpPct = Math.max(0, Math.min(1, hud.xp / hud.xpNext)) * 100;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 8 }]}
    >
      <View style={styles.row}>
        <View style={styles.panel}>
          <Text style={styles.hpLabel}>
            HP {Math.ceil(hud.hp)}/{Math.round(hud.maxHp)}
          </Text>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${hpPct}%`, backgroundColor: "#EF4444" }]} />
          </View>
        </View>
        <Pressable
          onPress={onPause}
          hitSlop={12}
          style={styles.pauseBtn}
          accessibilityLabel="Jeda permainan"
        >
          <Text style={styles.pauseText}>II</Text>
        </Pressable>
      </View>

      <View style={styles.row}>
        <View style={[styles.panel, styles.levelBadge]}>
          <Text style={styles.levelText}>LV {hud.level}</Text>
        </View>
        <View style={[styles.panel, styles.xpPanel]}>
          <View style={styles.barBg}>
            <View style={[styles.barFill, { width: `${xpPct}%`, backgroundColor: "#A78BFA" }]} />
          </View>
        </View>
      </View>

      <View style={[styles.row, styles.statsRow]}>
        <Text style={styles.stat}>{formatTime(hud.time)}</Text>
        <Text style={styles.stat}>Gelombang {hud.wave}</Text>
        <Text style={styles.stat}>Kill {hud.kills}</Text>
        <Text style={[styles.stat, styles.score]}>Skor {hud.score}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 12,
    right: 12,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  panel: {
    backgroundColor: "rgba(10, 8, 24, 0.72)",
    borderColor: "#2A2450",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  hpLabel: {
    color: "#FCA5A5",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  barBg: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  levelBadge: {
    minWidth: 56,
    alignItems: "center",
  },
  levelText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "800",
  },
  xpPanel: {
    flex: 1,
  },
  statsRow: {
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  stat: {
    color: "#8B85B0",
    fontSize: 11,
    fontWeight: "600",
  },
  score: {
    color: "#E5E0F5",
  },
  pauseBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(10, 8, 24, 0.72)",
    borderColor: "#2A2450",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseText: {
    color: "#C4B5FD",
    fontSize: 16,
    fontWeight: "800",
  },
});
