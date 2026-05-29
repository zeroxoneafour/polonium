import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
    globalIgnores(["pkg", "**/*.qml"]),
    {
        languageOptions: {
            globals: {},
            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "module",

            parserOptions: {
                project: "tsconfig.json",
            },
        },
    },
]);
