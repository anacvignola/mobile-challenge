import AsyncStorage from "@react-native-async-storage/async-storage";

import { supabase } from "./supabase";
import type { CollectionRepository, SavedWord } from "../types";
/** Constructor injection keeps UI independent of persistence. */
export const createCollectionRepository = (
  userId?: string,
): CollectionRepository => {
  const key = `lexi:collection:v1:${userId ?? "guest"}`;
  let queue: Promise<void> = Promise.resolve();

  return {
    load: async () => {
      if (userId && supabase) {
        const { data, error } = await supabase
          .from("user_words")
          .select("word,favorite,viewed_at")
          .eq("user_id", userId)
          .order("viewed_at", { ascending: false });
        if (error)
          throw new Error("Could not load your collection. Please retry.");
        return data.map((row) => ({
          word: row.word,
          favorite: row.favorite,
          viewedAt: row.viewed_at,
        }));
      }

      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);

      if (
        !Array.isArray(parsed) ||
        !parsed.every(
          (item) =>
            typeof item.word === "string" &&
            typeof item.favorite === "boolean" &&
            typeof item.viewedAt === "string",
        )
      )
        throw new Error("Could not read your collection.");
      return parsed as SavedWord[];
    },
    save: (item) => {
      const operation = queue
        .catch(() => {})
        .then(async () => {
          if (userId && supabase) {
            const { error } = await supabase.from("user_words").upsert({
              user_id: userId,
              word: item.word,
              favorite: item.favorite,
              viewed_at: item.viewedAt,
            });
            if (error) throw new Error("Could not save. Please try again.");
          } else {
            const raw = await AsyncStorage.getItem(key);
            const items: SavedWord[] = raw ? JSON.parse(raw) : [];
            await AsyncStorage.setItem(
              key,
              JSON.stringify([
                item,
                ...items.filter((row) => row.word !== item.word),
              ]),
            );
          }
        });
      queue = operation;
      return operation;
    },
  };
};
