import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";

import { getDefinition } from "../services/dictionary";
import type { Entry } from "../types";
import { colors as c } from "../theme";
import { Button } from "./Button";

export const WordDetail = ({
  word,
  favorite,
  busy,
  onClose,
  onFavorite,
  onMove,
  canBack,
  canNext,
  onViewed,
  saveError,
}: {
  saveError?: string;
  word: string;
  favorite: boolean;
  busy: boolean;
  onClose: () => void;
  onFavorite: () => void;
  onMove: (offset: number) => void;
  canBack: boolean;
  canNext: boolean;
  onViewed: (word: string) => void;
}) => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [retry, setRetry] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEntries([]);
    setError("");
    setSpeaking(false);
    void Speech.stop();
    getDefinition(word)
      .then((result) => {
        if (active) {
          setEntries(result.entries);
          setOffline(result.offline);
          onViewed(word);
        }
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Something went wrong.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      void Speech.stop();
    };
  }, [word, retry, onViewed]);

  const phonetic =
    entries[0]?.phonetic ??
    entries[0]?.phonetics.find((item) => item.text)?.text;

  const speak = () => {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(word, {
      language: "en-US",
      rate: 0.8,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => {
        setSpeaking(false);
        setError("Pronunciation is unavailable on this device.");
      },
    });
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.top}>
          <Button secondary label="← Back" onPress={onClose} />
          <Text style={styles.eyebrow}>WORD EXPLORER</Text>
          <Button
            secondary
            disabled={busy || loading || !entries.length}
            label={favorite ? "♥ Saved" : "♡ Save"}
            onPress={onFavorite}
          />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {!!saveError && (
            <Text accessibilityRole="alert" style={{ color: c.error }}>
              {saveError}
            </Text>
          )}
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>
              A LITTLE WORD. A NEW POSSIBILITY.
            </Text>
            <Text accessibilityRole="header" style={styles.word}>
              {word}
            </Text>
            <Text style={styles.phonetic}>
              {phonetic || "Discover its meaning below"}
            </Text>
            <Button
              label={
                speaking ? "■ Stop pronunciation" : "▶ Listen · English (US)"
              }
              onPress={speak}
            />
          </View>
          {loading ? (
            <ActivityIndicator
              accessibilityLabel="Loading definition"
              color={c.green}
              size="large"
            />
          ) : error && !entries.length ? (
            <View style={styles.block}>
              <Text accessibilityRole="alert" style={styles.body}>
                {error}
              </Text>
              <Button
                label="Try again"
                onPress={() => setRetry((value) => value + 1)}
              />
            </View>
          ) : (
            <>
              <Text accessibilityRole="header" style={styles.heading}>
                Meanings
              </Text>
              {offline && (
                <Text style={styles.body}>
                  Offline · showing your saved definition
                </Text>
              )}
              {error ? <Text accessibilityRole="alert">{error}</Text> : null}
              {entries.map((entry, entryIndex) =>
                entry.meanings.map((meaning, index) => (
                  <View key={`${entryIndex}-${index}`} style={styles.block}>
                    <Text style={styles.part}>{meaning.partOfSpeech}</Text>
                    {meaning.definitions.map((definition, i) => (
                      <View key={i} style={styles.definition}>
                        <Text style={styles.body}>
                          <Text style={styles.number}>
                            {String(i + 1).padStart(2, "0")}{" "}
                          </Text>
                          {definition.definition}
                        </Text>
                        {definition.example && (
                          <Text style={styles.example}>
                            “{definition.example}”
                          </Text>
                        )}
                      </View>
                    ))}
                    {!!meaning.synonyms?.length && (
                      <Text style={styles.example}>
                        Synonyms · {meaning.synonyms.join(", ")}
                      </Text>
                    )}
                  </View>
                )),
              )}
              <Text style={styles.credit}>
                Definitions · Free Dictionary API · Source licenses apply
              </Text>
              {entries[0]?.sourceUrls
                ?.filter((url) => url.startsWith("https://"))
                .map((url) => (
                  <Button
                    key={url}
                    secondary
                    label="Read original source ↗"
                    onPress={() => {
                      void Linking.openURL(url).catch(() =>
                        setError("Could not open source."),
                      );
                    }}
                  />
                ))}
            </>
          )}
        </ScrollView>
        <View style={styles.navigation}>
          <View style={styles.flex}>
            <Button
              secondary
              label="← Previous"
              disabled={busy || !canBack}
              onPress={() => onMove(-1)}
            />
          </View>
          <View style={styles.flex}>
            <Button
              label="Next word →"
              disabled={busy || !canNext}
              onPress={() => onMove(1)}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  top: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: c.green,
  },
  content: { padding: 20, gap: 20, paddingBottom: 32 },
  hero: { padding: 24, borderRadius: 24, backgroundColor: c.pale, gap: 20 },
  word: { fontFamily: "Georgia", fontSize: 44, color: c.ink },
  phonetic: { fontSize: 19, color: c.muted },
  heading: { fontSize: 26, fontFamily: "Georgia", color: c.ink },
  block: { padding: 20, borderRadius: 20, backgroundColor: c.paper, gap: 16 },
  part: { fontSize: 14, fontStyle: "italic", color: c.green },
  definition: { gap: 8 },
  body: { fontSize: 16, lineHeight: 26, color: c.ink },
  number: { color: c.green, fontWeight: "600" },
  example: {
    fontSize: 15,
    lineHeight: 24,
    color: c.muted,
    fontStyle: "italic",
  },
  credit: { fontSize: 12, color: c.muted },
  navigation: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderColor: c.line,
  },
  flex: { flex: 1 },
});
