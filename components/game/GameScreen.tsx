// Arcana Survival — game screen orchestrator: render loop, joystick gesture,
// HUD refresh, banner, level-up / pause / game-over overlays.

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
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { formatTime, IDLE_INPUT } from "./engine";
import type { Banner, UpgradeChoice, World, WorldStatus } from "./engine";
import { chooseUpgrade } from "./content";
import { createWorld, stepWorld } from "./world";
import { buildGamePicture } from "./render";
import { loadBest, saveBest } from "./storage";
import type { BestRecord } from "./storage";
import { Hud } from "./Hud";
import type { HudState } from "./Hud";
import { GameOverOverlay, LevelUpModal, PauseOverlay } from "./Modals";

type FullHud = HudState & {
  status: WorldStatus;
  choices: UpgradeChoice[];
  banner: Banner | null;
};

function readHud(w: World): FullHud {
  const giant = w.giantId !== null ? w.enemies.find((e) => e.id === w.giantId) : undefined;
  return {
    hp: w.player.hp,
    maxHp: w.player.maxHp,
    xp: w.player.xp,
    xpNext: w.player.xpNext,
    level: w.player.level,
    wave: w.wave,
    time: w.t,
    kills: w.player.kills,
    score: w.score,
    status: w.status,
    choices: w.choices,
    banner: w.banner,
    horde: w.hordeT !== null,
    giantHp: giant ? giant.hp : 0,
    giantMax: giant ? giant.maxHp : 0,
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

function BannerView({ banner }: { banner: Banner | null }) {
  if (!banner) return null;
  const a = Math.min(1, banner.t / 0.4);
  return (
    <View pointerEvents="none" style={styles.bannerWrap}>
      <Text style={[styles.bannerTitle, { color: banner.color, opacity: a }]}>{banner.title}</Text>
      <Text style={[styles.bannerSub, { opacity: a }]}>{banner.sub}</Text>
    </View>
  );
}

export default function GameScreen() {
  useKeepAwake();
  const router = useRouter();

  const worldRef = useRef<World>(createWorld());
  const inputRef = useRef(IDLE_INPUT);
  const sizeRef = useRef({ w: 0, h: 0 });
  const savedRef = useRef(false);

  const [picture, setPicture] = useState<SkPicture | null>(null);
  const [hud, setHud] = useState<FullHud>(() => readHud(worldRef.current));
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
      const { w: vw, h: vh } = sizeRef.current;
      if (vw > 0 && vh > 0) {
        setPicture(buildGamePicture(w, vw, vh));
      }
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
          kills: w.player.kills,
          time: w.t,
          level: w.player.level,
          wave: w.wave,
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
      inputRef.current = IDLE_INPUT;
    })
    .onFinalize(() => {
      inputRef.current = IDLE_INPUT;
    });

  const pause = useCallback(() => {
    if (worldRef.current.status === "running") worldRef.current.status = "paused";
  }, []);

  const resume = useCallback(() => {
    if (worldRef.current.status === "paused") worldRef.current.status = "running";
  }, []);

  const retry = useCallback(() => {
    worldRef.current = createWorld();
    inputRef.current = IDLE_INPUT;
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

  const { status } = hud;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={StyleSheet.absoluteFill}>
            {picture ? <Picture picture={picture} /> : null}
          </Canvas>
        </View>
      </GestureDetector>

      {status === "running" ? <BannerView banner={hud.banner} /> : null}
      <Hud hud={hud} onPause={pause} />

      {status === "levelup" ? (
        <LevelUpModal level={hud.level} choices={hud.choices} onPick={pick} />
      ) : null}
      {status === "paused" ? (
        <PauseOverlay onResume={resume} onRetry={retry} onQuit={quit} />
      ) : null}
      {status === "dead" ? (
        <GameOverOverlay
          score={hud.score}
          time={formatTime(hud.time)}
          kills={hud.kills}
          level={hud.level}
          wave={hud.wave}
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
  bannerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "30%",
    alignItems: "center",
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 3,
    textShadowColor: "#000000",
    textShadowRadius: 10,
  },
  bannerSub: {
    color: "#C4B5FD",
    fontSize: 13,
    marginTop: 4,
    textShadowColor: "#000000",
    textShadowRadius: 8,
  },
});
