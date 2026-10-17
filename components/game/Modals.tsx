// Arcana Survival — overlays: level-up choice, pause, game over.
import { Canvas, Picture } from "@shopify/react-native-skia";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { UpgradeChoice } from "./engine";
import { formatTime } from "./engine";
import { PASSIVE_DEFS, SPELL_DEFS } from "./content";
import { spellIconPicture } from "./render";
import type { PassiveId, SpellId } from "./engine";
import type { BestRecord } from "./storage";

// ---------------------------------------------------------------------------
// Level-up
// ---------------------------------------------------------------------------

interface LevelUpProps {
  level: number;
  choices: UpgradeChoice[];
  onPick: (index: number) => void;
}

export function LevelUpModal({ level, choices, onPick }: LevelUpProps) {
  return (
    <View style={styles.backdrop}>
      <Text style={styles.levelUpTitle}>NAIK LEVEL</Text>
      <Text style={styles.levelUpSub}>Level {level} — pilih penguatan:</Text>
      <View style={styles.choices}>
        {choices.map((choice, i) => (
          <Pressable
            key={choice.key}
            onPress={() => onPick(i)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Canvas style={styles.cardIcon}>
              <Picture picture={spellIconPicture(choice.id, 40)} />
            </Canvas>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{choice.title}</Text>
              <Text style={styles.cardDesc}>{choice.desc}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}


// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

interface BtnProps {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "ghost";
}

function Btn({ label, onPress, kind = "primary" }: BtnProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        kind === "primary" && styles.btnPrimary,
        kind === "secondary" && styles.btnSecondary,
        kind === "ghost" && styles.btnGhost,
        pressed && styles.btnPressed,
      ]}
    >
      <Text
        style={[
          styles.btnLabel,
          kind === "primary" && styles.btnLabelPrimary,
          kind === "ghost" && styles.btnLabelGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Pause
// ---------------------------------------------------------------------------

interface PauseProps {
  onResume: () => void;
  onRetry: () => void;
  onQuit: () => void;
}

export function PauseOverlay({ onResume, onRetry, onQuit }: PauseProps) {
  return (
    <View style={styles.backdrop}>
      <Text style={styles.overlayTitle}>JEDA</Text>
      <View style={styles.btnCol}>
        <Btn label="LANJUT" onPress={onResume} />
        <Btn label="ULANG DARI AWAL" onPress={onRetry} kind="secondary" />
        <Btn label="MENU UTAMA" onPress={onQuit} kind="ghost" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Game over
// ---------------------------------------------------------------------------

interface GameOverProps {
  score: number;
  time: string;
  kills: number;
  level: number;
  wave: number;
  best: BestRecord | null;
  newBest: boolean;
  onRetry: () => void;
  onQuit: () => void;
}

export function GameOverOverlay({
  score,
  time,
  kills,
  level,
  wave,
  best,
  newBest,
  onRetry,
  onQuit,
}: GameOverProps) {
  return (
    <View style={styles.backdrop}>
      <Text style={[styles.overlayTitle, styles.deadTitle]}>GUGUR DI ARENA</Text>
      {newBest ? <Text style={styles.newBest}>REKOR BARU!</Text> : null}
      <Text style={styles.finalScore}>{score}</Text>
      <Text style={styles.finalScoreLabel}>SKOR</Text>
      <View style={styles.statGrid}>
        <Text style={styles.statItem}>Waktu {time}</Text>
        <Text style={styles.statItem}>Kill {kills}</Text>
        <Text style={styles.statItem}>Level {level}</Text>
        {wave > 0 ? (
          <Text style={styles.statItem}>Gelombang Kematian {wave}</Text>
        ) : null}
        <Text style={styles.statItem}>
          Rekor {best ? best.score : score}
        </Text>
      </View>
      <View style={styles.btnCol}>
        <Btn label="MAIN LAGI" onPress={onRetry} />
        <Btn label="MENU UTAMA" onPress={onQuit} kind="ghost" />
      </View>
      {best ? (
        <Text style={styles.bestFootnote}>
          Rekor tertinggi: {best.score} • bertahan {formatTime(best.time)}
        </Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(5, 4, 12, 0.86)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  levelUpTitle: {
    color: "#E8E0C9",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 4,
    textShadowColor: "#000000",
    textShadowRadius: 18,
  },
  levelUpSub: {
    color: "#B7AB93",
    fontSize: 14,
    marginBottom: 10,
  },
  choices: {
    gap: 12,
    width: "100%",
    maxWidth: 430,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#E8E0C9",
    borderColor: "#1F1B16",
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
  },
  cardIcon: {
    width: 40,
    height: 40,
  },
  cardPressed: {
    backgroundColor: "#F5EFDC",
    borderColor: "#C0392B",
  },
  cardGlyph: {
    fontSize: 30,
    fontWeight: "900",
    width: 40,
    textAlign: "center",
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: "#1F1B16",
    fontSize: 16,
    fontWeight: "800",
  },
  cardDesc: {
    color: "#5A4F3F",
    fontSize: 13,
    lineHeight: 18,
  },
  overlayTitle: {
    color: "#E8E0C9",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 6,
    textShadowColor: "#000000",
    textShadowRadius: 18,
  },
  deadTitle: {
    color: "#F87171",
    textShadowColor: "#B91C1C",
    letterSpacing: 3,
  },
  newBest: {
    color: "#FDE047",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 2,
  },
  finalScore: {
    color: "#E8E0C9",
    fontSize: 54,
    fontWeight: "900",
    textShadowColor: "#000000",
    textShadowRadius: 14,
  },
  finalScoreLabel: {
    color: "#8B85B0",
    fontSize: 12,
    letterSpacing: 4,
    marginTop: -8,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    marginVertical: 8,
  },
  statItem: {
    color: "#A5A0C8",
    fontSize: 13,
    fontWeight: "600",
  },
  btnCol: {
    gap: 10,
    width: "100%",
    maxWidth: 320,
    marginTop: 10,
  },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnPrimary: {
    backgroundColor: "#7C3AED",
  },
  btnSecondary: {
    backgroundColor: "#221B44",
    borderWidth: 1,
    borderColor: "#7C3AED",
  },
  btnGhost: {
    backgroundColor: "transparent",
  },
  btnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#221B44",
  },
  btnLabelPrimary: {
    color: "#F5F3FF",
  },
  btnLabelGhost: {
    color: "#8B85B0",
  },
  bestFootnote: {
    color: "#575380",
    fontSize: 12,
    marginTop: 4,
  },
});
