import { useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "../services/supabase";
import { Button } from "./Button";
import { colors as c } from "../theme";

export const Auth = ({ onClose }: { onClose: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!supabase) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8) {
      setMessage(
        "Use a valid email and a password with at least 8 characters.",
      );
      return;
    }
    setBusy(true);
    setMessage("");

    try {
      const result = register
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error) throw result.error;
      if (result.data.session) onClose();
      else
        setMessage("Check your email to confirm your account, then sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.form}
          >
            <Button secondary label="← Back to dictionary" onPress={onClose} />
            <Text style={styles.title}>Your words,\neverywhere.</Text>
            <Text style={styles.body}>
              Sign in to keep your favorites and reading history in your own
              collection.
            </Text>
            {supabase ? (
              <>
                <TextInput
                  style={styles.input}
                  accessibilityLabel="Email"
                  placeholder="Email address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                <TextInput
                  style={styles.input}
                  accessibilityLabel="Password"
                  placeholder="Password · at least 8 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete={register ? "new-password" : "current-password"}
                />
                <Button
                  disabled={busy}
                  label={
                    busy
                      ? "Please wait…"
                      : register
                        ? "Create account"
                        : "Sign in"
                  }
                  onPress={() => void submit()}
                />
                <Button
                  secondary
                  disabled={busy}
                  label={
                    register
                      ? "Already have an account? Sign in"
                      : "New here? Create an account"
                  }
                  onPress={() => {
                    setRegister(!register);
                    setMessage("");
                  }}
                />
                {!!message && (
                  <Text accessibilityRole="alert" style={styles.body}>
                    {message}
                  </Text>
                )}
              </>
            ) : (
              <View>
                <Text style={styles.body}>
                  Cloud accounts are not configured in this build. You can
                  explore and save words on this device. See the README to
                  connect Supabase.
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  form: { padding: 28, gap: 20, flexGrow: 1, justifyContent: "center" },
  title: { fontFamily: "Georgia", fontSize: 44, color: c.ink },
  body: { fontSize: 16, lineHeight: 26, color: c.muted },
  input: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 16,
    padding: 16,
    minHeight: 52,
    backgroundColor: c.paper,
    color: c.ink,
  },
});
