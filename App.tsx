import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";
import words from "./src/data/words.json";
import type { Tab } from "./src/types";
import { pageWords } from "./src/services/core.mjs";
import { supabase } from "./src/services/supabase";
import { useCollection } from "./src/hooks/useCollection";
import { Button } from "./src/components/Button";
import { WordDetail } from "./src/components/WordDetail";
import { Auth } from "./src/components/Auth";
import { colors as c } from "./src/theme";

const tabs: Tab[] = ["Explore", "History", "Favorites"];

const WordCard = memo(
  ({
    word,
    favorite,
    onOpen,
  }: {
    word: string;
    favorite: boolean;
    onOpen: (word: string) => void;
  }) => {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${word}${
          favorite ? ", saved as favorite" : ""
        }`}
        onPress={() => onOpen(word)}
        style={({ pressed }) => [styles.card, { opacity: pressed ? 0.65 : 1 }]}
      >
        <Text style={styles.cardMark}>{favorite ? "♥" : "Aa"}</Text>
        <Text numberOfLines={2} style={styles.cardWord}>
          {word}
        </Text>
        <Text style={styles.cardHint}>Discover meaning ↗</Text>
      </Pressable>
    );
  },
);

const DictionaryApp = () => {
  const { width } = useWindowDimensions();
  const columns = width >= 600 ? 3 : 2;
  const [tab, setTab] = useState<Tab>("Explore");
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [page, setPage] = useState(1);
  const [session, setSession] = useState<Session | null>(null);
  const [auth, setAuth] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sessionReady, setSessionReady] = useState(!supabase);
  const [selection, setSelection] = useState<{
    words: string[];
    index: number;
  } | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const client = supabase;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, value) => {
      if (active) {
        setSession(value);
        setSessionReady(true);
      }
    });

    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(error.message);
        setSession(data.session);
        setSessionReady(true);
      })
      .catch(() => {
        if (active) {
          setAuthError("Could not restore your session.");
          setSessionReady(true);
        }
      });

    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });

    client.auth.startAutoRefresh();

    return () => {
      active = false;
      subscription.unsubscribe();
      listener.remove();
      client.auth.stopAutoRefresh();
    };
  }, []);

  useEffect(() => {
    setSelection(null);
  }, [session?.user.id]);

  const collection = useCollection(session?.user.id);

  const favorites = useMemo(
    () =>
      new Set(
        collection.items
          .filter((item) => item.favorite)
          .map((item) => item.word),
      ),
    [collection.items],
  );

  const source = useMemo(
    () =>
      tab === "Explore"
        ? words
        : collection.items
            .filter((item) => tab === "History" || item.favorite)
            .map((item) => item.word),
    [tab, collection.items],
  );

  const result = useMemo(
    () => pageWords(source, deferred, page),
    [source, deferred, page],
  );

  const open = useCallback(
    (word: string) => {
      const index = result.items.indexOf(word);
      if (index >= 0) setSelection({ words: result.items, index });
    },
    [result.items],
  );

  const selected = selection?.words[selection.index];

  const changeTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    setPage(1);
  };

  const signOut = async () => {
    try {
      const result = await supabase?.auth.signOut();
      if (result?.error) throw result.error;
    } catch {
      setAuthError("Could not sign out. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>L.</Text>
            </View>
            <Text style={styles.brandText}>
              lexi<Text style={{ color: c.green }}>.</Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={session ? "Sign out" : "Sign in"}
            onPress={() => (session ? void signOut() : setAuth(true))}
            style={styles.account}
          >
            <Text style={styles.accountText}>
              {session ? "Sign out ↗" : "Sign in ↗"}
            </Text>
          </Pressable>
        </View>
        <FlatList
          key={columns}
          data={result.items}
          numColumns={columns}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <WordCard
              word={item}
              favorite={favorites.has(item)}
              onOpen={open}
            />
          )}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={18}
          maxToRenderPerBatch={18}
          windowSize={7}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (result.hasMore) setPage((value) => value + 1);
          }}
          ListHeaderComponent={
            <View>
              <Text style={styles.eyebrow}>MAKE ROOM FOR NEW WORDS</Text>
              <Text accessibilityRole="header" style={styles.title}>
                A world of words.{"\n"}
                <Text style={{ color: c.green }}>Yours to explore.</Text>
              </Text>
              <Text style={styles.subtitle}>
                A little curiosity. A new discovery. Every day.
              </Text>
              <View style={styles.feature}>
                <View style={styles.featureTop}>
                  <Text style={styles.featureLabel}>
                    ✧ A WORD TO WONDER ABOUT
                  </Text>
                  <Text style={styles.featureLabel}>01 / DAILY</Text>
                </View>
                <Text style={styles.featureWord}>serendipity</Text>
                <Text style={styles.featurePhonetic}>
                  /ˌser.ənˈdɪp.ə.ti/ · noun
                </Text>
                <Text style={styles.featureDescription}>
                  The lovely art of finding something beautiful when you weren’t
                  looking for it.
                </Text>
                <Button
                  secondary
                  label="Explore this word ↗"
                  disabled={!collection.ready || !sessionReady}
                  onPress={() =>
                    setSelection({ words: ["serendipity"], index: 0 })
                  }
                />
              </View>
              <View accessibilityRole="tablist" style={styles.tabs}>
                {tabs.map((item) => (
                  <Pressable
                    key={item}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: tab === item }}
                    onPress={() => changeTab(item)}
                    style={[styles.tab, tab === item && styles.activeTab]}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        tab === item && { color: c.paper },
                      ]}
                    >
                      {item === "Explore" ? "Word list" : item}
                      {item === "Favorites" ? ` · ${favorites.size}` : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.search}>
                <Text style={{ fontSize: 22, color: c.green }}>⌕</Text>
                <TextInput
                  accessibilityLabel="Search words by prefix"
                  placeholder="Find your next word…"
                  placeholderTextColor={c.muted}
                  value={query}
                  onChangeText={(value) => {
                    setQuery(value);
                    setPage(1);
                  }}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                  style={styles.searchInput}
                />
                {!!query && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                    onPress={() => {
                      setQuery("");
                      setPage(1);
                    }}
                    style={{ padding: 10 }}
                  >
                    <Text style={{ color: c.green, fontSize: 20 }}>×</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.section}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  {tab === "Explore"
                    ? "The dictionary"
                    : tab === "History"
                      ? "Your discoveries"
                      : "Words you love"}
                </Text>
                <Text style={styles.count}>
                  {result.total.toLocaleString()} WORDS
                </Text>
              </View>
              {words.length < 300000 && tab === "Explore" && (
                <Text style={styles.notice}>
                  Starter dictionary · run npm run words:import for the complete
                  collection.
                </Text>
              )}
              {(!!collection.error || !!authError) && (
                <View style={styles.noticeBox}>
                  <Text accessibilityRole="alert" style={{ color: c.error }}>
                    {collection.error || authError}
                  </Text>
                  {!!collection.error && (
                    <Button
                      secondary
                      label="Retry collection"
                      onPress={collection.retry}
                    />
                  )}
                </View>
              )}
              {(!collection.ready || !sessionReady) && !collection.error && (
                <ActivityIndicator
                  color={c.green}
                  accessibilityLabel="Loading your collection"
                  style={{ padding: 16 }}
                />
              )}
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>
                {tab === "Favorites" ? "♡" : "Aa"}
              </Text>
              <Text style={styles.sectionTitle}>
                {query
                  ? "No words found"
                  : tab === "History"
                    ? "Your story starts here"
                    : "Keep the words you love"}
              </Text>
              <Text style={styles.subtitle}>
                {query
                  ? "Try another beginning. Search matches the start of a word."
                  : tab === "History"
                    ? "Open a word to add it to your reading history."
                    : "Tap Save inside a definition to find it here."}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {result.hasMore ? (
                <Button
                  secondary
                  label="Load more words ↓"
                  onPress={() => setPage((value) => value + 1)}
                />
              ) : (
                <Text style={styles.footerText}>
                  STAY CURIOUS. KEEP EXPLORING.
                </Text>
              )}
              <Text style={styles.footerText}>
                {session
                  ? "Your personal cloud collection"
                  : "Guest collection · saved on this device"}
              </Text>
            </View>
          }
        />
      </View>
      {selected && collection.ready && sessionReady && (
        <WordDetail
          word={selected}
          favorite={favorites.has(selected)}
          busy={collection.busy}
          saveError={collection.error}
          onClose={() => setSelection(null)}
          onFavorite={() => collection.toggle(selected)}
          onViewed={collection.viewed}
          canBack={selection!.index > 0}
          canNext={selection!.index < selection!.words.length - 1}
          onMove={(offset) =>
            setSelection((previous) =>
              previous ? { ...previous, index: previous.index + offset } : null,
            )
          }
        />
      )}{" "}
      {auth && <Auth onClose={() => setAuth(false)} />}
    </SafeAreaView>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <DictionaryApp />
    </SafeAreaProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.background },
  container: { flex: 1, width: "100%", maxWidth: 900, alignSelf: "center" },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 38,
    height: 38,
    backgroundColor: c.green,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { color: c.paper, fontFamily: "Georgia", fontSize: 26 },
  brandText: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -1,
    color: c.ink,
  },
  account: { minHeight: 48, justifyContent: "center", padding: 10 },
  accountText: { color: c.green, fontWeight: "600", fontSize: 14 },
  list: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 24 },
  eyebrow: {
    color: c.green,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 2,
  },
  title: {
    fontFamily: "Georgia",
    fontSize: 39,
    lineHeight: 47,
    color: c.ink,
    marginTop: 14,
    letterSpacing: -1,
  },
  subtitle: { fontSize: 14, lineHeight: 23, color: c.muted, marginTop: 12 },
  feature: {
    backgroundColor: c.green,
    borderRadius: 24,
    padding: 22,
    marginTop: 26,
    gap: 12,
  },
  featureTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  featureLabel: {
    fontSize: 9,
    letterSpacing: 1,
    color: "#DDE9D9",
    fontWeight: "600",
  },
  featureWord: {
    fontFamily: "Georgia",
    fontSize: 35,
    color: c.paper,
    marginTop: 8,
  },
  featurePhonetic: { fontSize: 14, color: "#DDE9D9" },
  featureDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: "#F2F5EE",
    marginBottom: 5,
  },
  tabs: {
    flexDirection: "row",
    padding: 4,
    backgroundColor: "#E9ECE4",
    borderRadius: 16,
    marginTop: 28,
    gap: 3,
  },
  tab: {
    flex: 1,
    minHeight: 46,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  activeTab: { backgroundColor: c.green },
  tabText: { fontSize: 13, color: c.muted, fontWeight: "600" },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    backgroundColor: c.paper,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 15,
    marginTop: 20,
  },
  searchInput: { flex: 1, minHeight: 52, fontSize: 15, color: c.ink },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: { fontFamily: "Georgia", fontSize: 23, color: c.ink },
  count: { fontSize: 10, color: c.muted, letterSpacing: 1 },
  row: { gap: 12 },
  card: {
    flex: 1,
    maxWidth: "50%",
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 18,
    backgroundColor: c.paper,
    padding: 16,
    marginBottom: 12,
    minHeight: 135,
    justifyContent: "space-between",
    gap: 10,
  },
  cardMark: { fontSize: 14, color: c.green },
  cardWord: { fontFamily: "Georgia", fontSize: 21, color: c.ink },
  cardHint: { fontSize: 10, color: c.muted },
  notice: { fontSize: 12, color: c.muted, lineHeight: 18, marginBottom: 16 },
  noticeBox: {
    gap: 12,
    padding: 16,
    backgroundColor: "#F9E8DF",
    borderRadius: 12,
    marginBottom: 16,
  },
  empty: { paddingVertical: 36, alignItems: "center", gap: 12 },
  emptyIcon: { fontSize: 40, color: c.green },
  footer: { paddingVertical: 24, gap: 20 },
  footerText: {
    textAlign: "center",
    fontSize: 10,
    letterSpacing: 1.2,
    color: c.muted,
  },
});
