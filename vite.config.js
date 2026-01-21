import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  //base: "/Plant-Monitoring-System_PC/",
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy API requests to bypass CORS during development
      "/api": {
        target: "https://api.protonestconnect.co",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, "/api/v1"),
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          charts: ["recharts"],
          websocket: ["@stomp/stompjs"],
        },
      },
    },
  },
});
