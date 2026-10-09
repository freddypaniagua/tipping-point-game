import { defineConfig } from "vite";

// base "./" makes asset paths relative, so the build works from any GitHub Pages
// subpath (https://<user>.github.io/<repo>/) without hard-coding the repo name.
export default defineConfig({
  base: "./",
});
