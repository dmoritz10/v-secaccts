import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  optimizeDeps: {
    include: [
      'vuetify',
      'vuetify/components',
      'vuetify/directives',
      'dayjs',
      'dayjs/plugin/utc',
      'dayjs/plugin/relativeTime',
      'dayjs/plugin/isBetween',
      'dayjs/plugin/isSameOrAfter',
      'dayjs/plugin/isSameOrBefore',
    ],
  },
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically update service worker
      devOptions: {
        enabled: false, // Enable PWA in development
      },
      includeAssets: [
        '/icon-72x72.png',
        '/icon-96x96.png',
        '/icon-128x128.png',
        '/icon-144x144.png',
        '/icon-144x144.png',
        '/icon-152x152.png',
        '/icon-192x192.png',
        '/icon-384x384.png',
        '/icon-512x512.png',
      ],
      manifest: {
        id: '/v-secaccts',
        name: 'Accounts Companion',
        short_name: 'Accounts',
        description: 'Accounts Companion',
        theme_color: '#f9f9f9',
        background_color: '#f9f9f9',
        orientation: 'portrait-primary',
        start_url: '/',
        display: 'standalone',
        icons: [
          { src: '/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB, up from default 2 MiB
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly', // Firestore requires network
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: '/', // Required for Firebase Hosting
  server: {
    port: 3000,
  },
});
