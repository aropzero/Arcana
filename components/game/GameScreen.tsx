// Arcana Survival — game screen orchestrator: render loop, joystick gesture,
// HUD refresh, level-up / pause / game-over overlays.

import { Canvas, Picture } from "@shopify/react-native-skia";
import type { SkPicture } from "@shopify/react-native-skia";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { emptyInput, formatTime } from "./engine";
import type { UpgradeChoice, World, WorldStatus } from "./engine";
import { chooseUpgrade } from "./content";
import { stepWorld, createWorld } from "./world";
import { buildPicture } from "./render";
import { loadBest, saveBest } from "./storage";
import type { BestRecord } from "./storage";
import { Hud } from "./Hud";
import { GameOverOverlay, LevelUpModal, PauseOverlay } from "./Modals";

interface HudState {
  hp: number;
  maxHp: number;
  xp: number;
  xpNext: number;
  level: number;
  wave: number;
  time: number;
  kills: number;
  score: number;
  status: WorldStatus;
  choices: UpgradeChoice[];
}

function readHud(w: World): HudState {
  return {
    hp: w.player.hp,
    maxHp: w.player.maxHp,
    xp: w.player.xp,
    xpNext: w.player.xpNext,
    level: w.player.level,
    wave: Math.floor(w.t / 30) + 1,
    time: w.t,
    kills: w.kills,
    score: w.score,
    status: w.status,
    choices: w.choices,
  };
}

function buzz(): void {
  if (Platform.OS === "web") return;
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // haptics unsupported — ignore
  }
}

export default function GameScreen() {
  useKeepAwake();
  const router = useRouter();

  const worldRef = useRef<World>(createWorld());
  const inputRef = useRef(emptyInput());
  const sizeRef = useRef({ w: 0, h: 0 });
  const savedRef = useRef(false);

  const [picture, setPicture] = useState<SkPicture | null>(null);
  const [hud, setHud] = useState<HudState>(() => readHud(worldRef.current));
  const [best, setBest] = useState<BestRecord | null>(null);
  const [newBest, setNewBest] = useState(false);

  // --- Main loop: fixed-step simulation + per-frame Skia picture ---
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = worldRef.current;
      stepWorld(w, dt, inputRef.current);
      const pic = buildPicture(w, sizeRef.current.w, sizeRef.current.h, inputRef.current);
      if (pic) setPicture(pic);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // --- HUD refresh (~8 Hz) + game-over persistence ---
  useEffect(() => {
    const iv = setInterval(() => {
      const w = worldRef.current;
      setHud(readHud(w));
      if (w.status === "dead" && !savedRef.current) {
        savedRef.current = true;
        buzz();
        const record: BestRecord = {
          score: w.score,
          kills: w.kills,
          time: w.t,
          level: w.player.level,
        };
        void saveBest(record).then((saved) => {
          if (saved) {
            setBest(record);
            setNewBest(true);
          }
        });
      }
    }, 120);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    void loadBest().then(setBest);
  }, []);

  // --- Auto-pause when the app goes to background ---
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "background" && worldRef.current.status === "running") {
        worldRef.current.status = "paused";
      }
    });
    return () => sub.remove();
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    sizeRef.current = { w: width, h: height };
    worldRef.current.view = { w: width, h: height };
  }, []);

  const pan = Gesture.Pan()
    .maxPointers(1)
    .onBegin((e) => {
      inputRef.current.active = true;
      inputRef.current.baseX = e.x;
      inputRef.current.baseY = e.y;
      inputRef.current.dx = 0;
      inputRef.current.dy = 0;
    })
    .onUpdate((e) => {
      inputRef.current.dx = e.x - inputRef.current.baseX;
      inputRef.current.dy = e.y - inputRef.current.baseY;
    })
    .onEnd(() => {
      inputRef.current.active = false;
    })
    .onFinalize(() => {
      inputRef.current.active = false;
    });

  const pause = useCallback(() => {
    if (worldRef.current.status === "running") worldRef.current.status = "paused";
  }, []);

  const resume = useCallback(() => {
    if (worldRef.current.status === "paused") worldRef.current.status = "running";
  }, []);

  const retry = useCallback(() => {
    worldRef.current = createWorld();
    inputRef.current = emptyInput();
    savedRef.current = false;
    setNewBest(false);
    setHud(readHud(worldRef.current));
  }, []);

  const pick = useCallback((index: number) => {
    chooseUpgrade(worldRef.current, index);
    buzz();
    setHud(readHud(worldRef.current));
  }, []);

  const quit = useCallback(() => {
    router.replace("/");
  }, [router]);

  return (
    <View style={styles.root} onLayout={onLayout}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {picture ? <Picture picture={picture} /> : null}
          </Canvas>
        </View>
      </GestureDetector>

      <Hud hud={hud} onPause={pause} />

      {hud.status === "levelup" ? (
        <LevelUpModal level={hud.level} choices={hud.choices} onPick={pick} />
      ) : null}
      {hud.status === "paused" ? (
        <PauseOverlay onResume={resume} onRetry={retry} onQuit={quit} />
      ) : null}
      {hud.status === "dead" ? (
        <GameOverOverlay
          score={hud.score}
          time={formatTime(hud.time)}
          kills={hud.kills}
          level={hud.level}
          best={best}
          newBest={newBest}
          onRetry={retry}
          onQuit={quit}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0B0A14",
  },
});
