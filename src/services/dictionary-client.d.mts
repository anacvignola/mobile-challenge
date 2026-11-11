import type { Entry } from "../types";
export class DictionaryError extends Error {}
export const createDictionaryClient: (ports: {
  storage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<unknown>;
  };
  fetcher: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}) => {
  getDefinition: (
    word: string,
  ) => Promise<{ entries: Entry[]; offline: boolean }>;
};
