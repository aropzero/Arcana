// Arcana Survival — persistent best record via AsyncStorage.

import AsyncStorage from "@react-native-async-storage/async-storage";

export interface BestRecord {
  score: number;
  kills: number;
  time: number;
  level: number;
  wave: number;
}

const KEY = "arcana.best.v1";

export async function loadBest(): Promise<BestRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BestRecord>;
    if (typeof parsed.score !== "number") return null;
    return {
      score: parsed.score,
      kills: typeof parsed.kills === "number" ? parsed.kills : 0,
      time: typeof parsed.time === "number" ? parsed.time : 0,
      level: typeof parsed.level === "number" ? parsed.level : 1,
      wave: typeof parsed.wave === "number" ? parsed.wave : 0,
    };
  } catch {
    return null;
  }
}

/** Saves the record only when it beats the stored best. Returns true if saved. */
export async function saveBest(record: BestRecord): Promise<boolean> {
  try {
    const current = await loadBest();
    if (current && current.score >= record.score) return false;
    await AsyncStorage.setItem(KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}
