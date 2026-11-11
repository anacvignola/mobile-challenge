import type { SavedWord } from "../types";
export const normalize: (word: string) => string;
export const pageWords: (
  words: string[],
  query: string,
  page: number,
  size?: number,
) => { items: string[]; hasMore: boolean; total: number };
export const mergeVisit: (
  items: SavedWord[],
  word: string,
  now?: string,
) => SavedWord[];
