export type Tab = "Explore" | "History" | "Favorites";

export interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
}

export interface Entry {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: Definition[];
    synonyms?: string[];
  }[];
  sourceUrls?: string[];
}

export interface SavedWord {
  word: string;
  favorite: boolean;
  viewedAt: string;
}

export interface CollectionRepository {
  load(): Promise<SavedWord[]>;
  save(word: SavedWord): Promise<void>;
}
