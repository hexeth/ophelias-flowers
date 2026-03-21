import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import clerk from "@clerk/astro";

export default defineConfig({
  output: "server",
  build: {
    inlineStylesheets: "always",
  },
  adapter: cloudflare({
    imageService: "cloudflare",
    platformProxy: {
      configPath: "./wrangler.local.toml",
      remoteBindings: false,
    },
  }),
  integrations: [tailwind(), react(), clerk()],
});
