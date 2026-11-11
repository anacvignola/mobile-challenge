import { writeFile, readFile } from "node:fs/promises";
const url =
  "https://raw.githubusercontent.com/dwyl/english-words/master/words_dictionary.json";
try {
  const source = process.argv[2]
    ? await readFile(process.argv[2], "utf8")
    : await (async () => {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })();
  const words = Object.keys(JSON.parse(source))
    .filter((word) => /^[a-z]+$/.test(word))
    .sort();
  if (words.length < 300000)
    throw new Error("Incomplete dictionary: expected at least 300,000 words");
  await writeFile(
    new URL("../src/data/words.json", import.meta.url),
    JSON.stringify(words)
  );
  console.log(`Imported ${words.length} words from dwyl/english-words.`);
} catch (error) {
  console.error(
    `Dictionary import failed: ${error.message}. The bundled starter list was preserved.`
  );
  process.exitCode = 1;
}
