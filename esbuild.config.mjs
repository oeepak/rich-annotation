import { build } from "esbuild";

build({
  entryPoints: ["src/plugin/code.ts"],
  bundle: true,
  outfile: "dist/code.js",
  format: "iife",
  target: "es2020",
  alias: {
    "@shared": "./src/shared",
  },
}).catch(() => process.exit(1));
