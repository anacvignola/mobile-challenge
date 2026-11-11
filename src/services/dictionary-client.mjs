export class DictionaryError extends Error {}

export const createDictionaryClient = ({
  storage,
  fetcher,
  now = Date.now,
  timeoutMs = 10000,
}) => {
  const pending = new Map();
  const ttl = 7 * 24 * 60 * 60 * 1000;
  const valid = (entries) => {
    return (
      Array.isArray(entries) &&
      entries.length > 0 &&
      entries.every(
        (entry) =>
          typeof entry.word === "string" &&
          Array.isArray(entry.meanings) &&
          Array.isArray(entry.phonetics),
      )
    );
  };

  const load = async (word) => {
    const key = `lexi:definition:v1:${word}`;
    let cached;
    try {
      const raw = await storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (valid(parsed.entries) && typeof parsed.at === "number")
          cached = parsed;
      }
    } catch {
      /* Ignore corrupt or unavailable cache. */
    }
    if (cached && now() - cached.at < ttl)
      return { entries: cached.entries, offline: false };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
          word,
        )}`,
        { signal: controller.signal },
      );
      if (response.status === 404)
        throw new DictionaryError("No definition yet. Try another word.");
      if (!response.ok) throw new Error("Request failed");
      const entries = await response.json();
      if (!valid(entries)) throw new Error("Invalid response");
      try {
        await storage.setItem(key, JSON.stringify({ at: now(), entries }));
      } catch {
        /* A full disk must not hide a successful lookup. */
      }
      return { entries, offline: false };
    } catch (error) {
      if (cached && !(error instanceof DictionaryError))
        return { entries: cached.entries, offline: true };
      if (error instanceof DictionaryError) throw error;
      throw new DictionaryError(
        "Unable to connect. Check your connection and try again.",
      );
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    getDefinition: (input) => {
      const word = input.trim().toLowerCase();
      if (pending.has(word)) return pending.get(word);
      const promise = load(word).finally(() => pending.delete(word));
      pending.set(word, promise);
      return promise;
    },
  };
};
