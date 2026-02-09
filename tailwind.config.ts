import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{astro,html,js,ts,md,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#faf8f5",
        ink: "#1a1a1a",
        stone: {
          300: "#d6d3d1",
          500: "#78716c",
        },
        dahlia: {
          blush: "#d4a0a0",
          wine: "#722f37",
        },
        botanical: "#4a6741",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
