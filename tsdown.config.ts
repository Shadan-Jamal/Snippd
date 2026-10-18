import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  outDir: "dist",
  clean: true,
  fixedExtension: true,
  external: ["better-sqlite3", "sqlite-vec"],
  copy: [
    { from: "server/templates", to: "dist/server/" },
  ],
  banner: "#!/usr/bin/env node\n"
});