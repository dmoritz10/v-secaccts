import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: "autoUpdate", // Automatically update service worker
      devOptions: {
        enabled: true, // Enable PWA in development
      },
      includeAssets: ["/secure144x144.png", "/secure512x512.png"],
      manifest: {
        name: "secaccts",
        short_name: "Secure Accounts",
        description: "",
        theme_color: "#f9f9f9",
        background_color: "#f9f9f9",
        orientation: "portrait-primary",
        start_url: "https://v-secaccts.web.app/",
        display: "standalone",
        icons: [
          {
            src: "/secure144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "/secure512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg}"],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: "NetworkOnly", // Firestore requires network
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  base: "/", // Required for Firebase Hosting
});
