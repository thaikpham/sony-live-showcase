import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2022",
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/react-dom") ||
            id.match(/node_modules\/react\//)
          ) {
            return "vendor-core";
          }

          if (id.includes("node_modules/motion")) {
            return "animations";
          }

          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }

          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "motion"],
  },
});
