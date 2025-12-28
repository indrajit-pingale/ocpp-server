import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // when running locally, proxy to localhost:3000
      "/api": "http://localhost:3000",
    },
  },
});
