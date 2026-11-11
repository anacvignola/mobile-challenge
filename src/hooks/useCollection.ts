import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createCollectionRepository } from "../services/collection";
import type { SavedWord } from "../types";
import { mergeVisit } from "../services/core.mjs";

export const useCollection = (userId?: string) => {
  const repository = useMemo(
    () => createCollectionRepository(userId),
    [userId],
  );

  const [items, setItems] = useState<SavedWord[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const values = useRef(items);
  const generation = useRef(0);
  const locked = useRef(false);

  useEffect(() => {
    const current = ++generation.current;
    setItems([]);
    values.current = [];
    setReady(false);
    setError("");
    locked.current = false;
    setBusy(false);
    repository
      .load()
      .then((data) => {
        if (generation.current === current) {
          values.current = data;
          setItems(data);
          setReady(true);
        }
      })
      .catch((reason) => {
        if (generation.current === current)
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load your words.",
          );
      });
    return () => {
      generation.current++;
    };
  }, [repository, revision]);

  const save = useCallback(
    async (word: string, toggle = false) => {
      if (locked.current || !ready) return;
      const current = generation.current;
      locked.current = true;
      setBusy(true);
      setError("");
      const next = mergeVisit(values.current, word);
      const item = next[0]!;
      if (toggle) item.favorite = !item.favorite;
      try {
        await repository.save(item);
        if (generation.current === current) {
          values.current = next;
          setItems(next);
        }
      } catch (reason) {
        if (generation.current === current)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not save your word.",
          );
      } finally {
        if (generation.current === current) {
          locked.current = false;
          setBusy(false);
        }
      }
    },
    [repository, ready],
  );

  const viewed = useCallback(
    (word: string) => {
      void save(word);
    },
    [save],
  );

  return {
    items,
    ready,
    busy,
    error,
    viewed,
    toggle: (word: string) => void save(word, true),
    retry: () => setRevision((value) => value + 1),
  };
};
