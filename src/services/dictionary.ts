import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDictionaryClient } from "./dictionary-client.mjs";
export { DictionaryError } from "./dictionary-client.mjs";

export const { getDefinition } = createDictionaryClient({
  storage: AsyncStorage,
  fetcher: (...args) => fetch(...args),
});
