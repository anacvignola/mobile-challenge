import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createDictionaryClient,
  DictionaryError,
} from "../src/services/dictionary-client.mjs";

const entries = [
  {
    word: "hello",
    phonetics: [],
    meanings: [
      { partOfSpeech: "noun", definitions: [{ definition: "A greeting." }] },
    ],
  },
];

const memory = () => {
  const map = new Map();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => {
      map.set(key, value);
    },
  };
};

const response = () => ({ ok: true, status: 200, json: async () => entries });

test("persistent cache avoids network after client recreation", async () => {
  const storage = memory();
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return response();
  };
  await createDictionaryClient({ storage, fetcher }).getDefinition(" Hello ");
  const result = await createDictionaryClient({
    storage,
    fetcher,
  }).getDefinition("hello");
  assert.equal(calls, 1);
  assert.deepEqual(result.entries, entries);
});

test("simultaneous requests deduplicate and normalize keys", async () => {
  let calls = 0;
  const client = createDictionaryClient({
    storage: memory(),
    fetcher: async () => {
      calls++;
      return response();
    },
  });
  const first = client.getDefinition("hello");
  const second = client.getDefinition(" HELLO ");
  assert.equal(first, second);
  await Promise.all([first, second]);
  assert.equal(calls, 1);
});

test("expired cache can be used offline", async () => {
  const storage = memory();
  await createDictionaryClient({
    storage,
    fetcher: async () => response(),
    now: () => 0,
  }).getDefinition("hello");
  const client = createDictionaryClient({
    storage,
    now: () => 8 * 86400000,
    fetcher: async () => {
      throw new Error("offline");
    },
  });
  assert.equal((await client.getDefinition("hello")).offline, true);
});

test("404 is not cached and user can retry", async () => {
  let calls = 0;
  const client = createDictionaryClient({
    storage: memory(),
    fetcher: async () => {
      calls++;
      return calls === 1 ? { ok: false, status: 404 } : response();
    },
  });
  await assert.rejects(client.getDefinition("hello"), DictionaryError);
  assert.deepEqual((await client.getDefinition("hello")).entries, entries);
  assert.equal(calls, 2);
});

test("corrupt cache and storage write failure do not block lookup", async () => {
  const client = createDictionaryClient({
    storage: {
      getItem: async () => "{invalid",
      setItem: async () => {
        throw new Error("full");
      },
    },
    fetcher: async () => response(),
  });
  assert.deepEqual((await client.getDefinition("hello")).entries, entries);
});

test("timeout aborts the request and returns a recoverable error", async () => {
  const client = createDictionaryClient({
    storage: memory(),
    timeoutMs: 5,
    fetcher: (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted"))),
      ),
  });
  await assert.rejects(client.getDefinition("hello"), /Unable to connect/);
});

test("invalid API responses are rejected and not cached", async () => {
  const client = createDictionaryClient({
    storage: memory(),
    fetcher: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ invalid: true }),
    }),
  });
  await assert.rejects(client.getDefinition("hello"), DictionaryError);
});
