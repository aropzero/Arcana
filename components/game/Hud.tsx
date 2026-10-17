// Arcana Survival — in-game HUD: blue mana bar on the top edge, cream clock
// band, stat chips, giant bar during death hordes. Minimal ink style.

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { formatTime } from "./engine";

export interface HudState {
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  wave: number;
  time: number;
  kills: number;
  score: number;
  horde: boolean;
  giantHp: number;
  giantMax: number;
}

interface HudProps {
  hud: HudState;
  onPause: () => void;
}

export function Hud({ hud, onPause }: HudProps) {
  const insets = useSafeAreaInsets();
  const xpPct = Math.max(0, Math.min(1, hud.xp / hud.xpNext)) * 100;
  const giantPct = hud.giantMax > 0 ? Math.max(0, Math.min(1, hud.giantHp / hud.giantMax)) * 100 : 0;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      {/* Mana bar pinned to the very top edge */}
      <View style={styles.manaTrack} pointerEvents="none">
        <View style={[styles.manaFill, { width: `${xpPct}%` }]} />
      </View>

      {/* Cream band: portrait, clock, pause */}
      <View style={[styles.band, { paddingTop: insets.top }]}>
        <Image source={require("../../assets/images/icon.png")} style={styles.portrait} />
        <View style={styles.clockBox}>
          <Text style={[styles.clock, hud.horde && styles.clockDanger]}>{formatTime(hud.time)}</Text>
          <Text style={styles.subLabel}>
            {hud.horde ? "WAKTU BERHENTI" : hud.wave > 0 ? `Gelombang Kematian ${hud.wave}` : "Bertahan"}
          </Text>
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

      {/* Stat chips */}
      <View style={styles.stats} pointerEvents="none">
        <Text style={styles.chip}>LV {hud.level}</Text>
        <Text style={styles.chip}>
          HP {Math.ceil(hud.hp)}/{Math.round(hud.maxHp)}
        </Text>
        <Text style={styles.chip}>Kill {hud.kills}</Text>
        <Text style={styles.chip}>Skor {hud.score}</Text>
      </View>

      {/* Giant boss bar during death hordes */}
      {hud.horde && hud.giantMax > 0 ? (
        <View style={styles.hordeWrap} pointerEvents="none">
          <Text style={styles.hordeLabel}>RAKSAUSA</Text>
          <View style={styles.hordeTrack}>
            <View style={[styles.hordeFill, { width: `${giantPct}%` }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  manaTrack: {
    height: 5,
    width: "100%",
    backgroundColor: "rgba(20, 25, 30, 0.55)",
  },
  manaFill: {
    height: "100%",
    backgroundColor: "#4A9FF5",
  },
  band: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#E8E0C9",
    borderBottomWidth: 2,
    borderBottomColor: "#1F1B16",
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  portrait: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#C0392B",
    backgroundColor: "#1F1B16",
  },
  clockBox: {
    flex: 1,
    alignItems: "center",
  },
  clock: {
    color: "#1F1B16",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  clockDanger: {
    color: "#C0392B",
  },
  subLabel: {
    color: "#6B5E4A",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  pauseBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1F1B16",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseText: {
    color: "#E8E0C9",
    fontSize: 15,
    fontWeight: "900",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  chip: {
    color: "#EFE6D6",
    backgroundColor: "rgba(31, 27, 22, 0.68)",
    borderColor: "#1F1B16",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
  },
  hordeWrap: {
    alignItems: "center",
    marginTop: 10,
    gap: 3,
  },
  hordeLabel: {
    color: "#EFE6D6",
    backgroundColor: "rgba(122, 31, 20, 0.85)",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 4,
  },
  hordeTrack: {
    width: "62%",
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(31, 27, 22, 0.7)",
    borderWidth: 1,
    borderColor: "#C0392B",
    overflow: "hidden",
  },
  hordeFill: {
    height: "100%",
    backgroundColor: "#C0392B",
  },
});
