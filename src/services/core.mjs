/** Pure, runtime-independent rules shared by the app and tests. */
export const normalize = (word) => word.trim().toLowerCase();
export const pageWords = (words, query, page, size = 60) => {
  const normalized = normalize(query);
  const filtered = normalized
    ? words.filter((word) => word.startsWith(normalized))
    : words;
  return {
    items: filtered.slice(0, page * size),
    hasMore: filtered.length > page * size,
    total: filtered.length,
  };
};
export const mergeVisit = (items, word, now = new Date().toISOString()) => {
  const previous = items.find((item) => item.word === word);
  return [
    { word, favorite: previous?.favorite ?? false, viewedAt: now },
    ...items.filter((item) => item.word !== word),
  ];
};
