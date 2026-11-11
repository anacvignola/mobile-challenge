import { Pressable, Text, StyleSheet } from "react-native";

import { colors as c } from "../theme";

export const Button = ({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={[styles.label, secondary && { color: c.green }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    padding: 14,
    borderRadius: 16,
    backgroundColor: c.green,
    justifyContent: "center",
    alignItems: "center",
  },
  secondary: { backgroundColor: c.pale },
  label: { fontSize: 15, fontWeight: "600", color: "white" },
});
