import tseslint from "typescript-eslint";
export default tseslint.config(
  { ignores: ["node_modules/**", ".expo/**", "dist/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  }
);
