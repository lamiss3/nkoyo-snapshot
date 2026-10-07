import { defineConfig } from "nitro";

export default defineConfig({
  vercel: { functions: { maxDuration: 300 } },
});
