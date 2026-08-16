import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const isPublicReleaseBuild = process.env.ALIGN_PUBLIC_RELEASE === "true";

export default defineConfig({
  envDir: isPublicReleaseBuild ? resolve(__dirname, "config/public-env") : undefined,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          ui: ["lucide-react", "date-fns", "zustand"],
        },
      },
    },
  },
});
