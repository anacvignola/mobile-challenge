import { test } from "node:test";
import assert from "node:assert/strict";

import { normalize, pageWords, mergeVisit } from "../src/services/core.mjs";

test("lookup keys normalize casing and whitespace", () =>
  assert.equal(normalize(" Hello "), "hello"));

test("pagination appends without replacing previously visible words", () => {
  const words = Array.from({ length: 151 }, (_, i) => String(i));
  const first = pageWords(words, "", 1);
  const next = pageWords(words, "", 2);
  assert.equal(first.items.length, 60);
  assert.equal(next.items.length, 120);
  assert.deepEqual(next.items.slice(0, 60), first.items);
  assert.equal(next.hasMore, true);
  assert.equal(pageWords(words, "", 3).hasMore, false);
});

test("prefix search works across the entire source, not only loaded pages", () => {
  const words = [...Array(80).fill("alpha"), "hello", "help", "world"];
  assert.deepEqual(pageWords(words, " HE ", 1).items, ["hello", "help"]);
  assert.equal(pageWords(words, "missing", 1).total, 0);
});

test("repeat visits preserve favorite and move word to the beginning without duplicates", () => {
  const initial = [
    { word: "hello", favorite: true, viewedAt: "2026-01-01" },
    { word: "world", favorite: false, viewedAt: "2026-01-02" },
  ];
  const updated = mergeVisit(initial, "hello", "2026-11-10");
  assert.equal(updated.length, 2);
  assert.deepEqual(updated[0], {
    word: "hello",
    favorite: true,
    viewedAt: "2026-11-10",
  });
  assert.equal(initial[0].viewedAt, "2026-01-01");
});

test("new visit starts without a favorite", () =>
  assert.equal(mergeVisit([], "new")[0].favorite, false));
