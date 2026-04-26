import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

      // ── Web App Manifest ────────────────────────────────────────────────
      manifest: {
        name: 'PhayuWittaya DJ',
        short_name: 'PhayuDJ',
        description: 'ระบบ DJ และจัดการเพลงโรงเรียนพายุพัฒน์',
        theme_color: '#060b18',
        background_color: '#060b18',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['music', 'entertainment', 'education'],
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'ขอเพลง',
            short_name: 'ขอเพลง',
            description: 'เปิดหน้าขอเพลงของนักเรียน',
            url: '/',
            icons: [{ src: 'pwa-192x192.svg', sizes: '192x192' }],
          },
        ],
      },

      // ── Workbox Caching Strategies ─────────────────────────────────────
      workbox: {
        // [TH] กลยุทธ์การแคช: cache-first สำหรับ static, network-first สำหรับข้อมูล
        // [EN] Cache strategy: cache-first for static assets, network-first for data
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],

        runtimeCaching: [
          // ── Firebase Realtime Database — NetworkFirst (ข้อมูล real-time ต้องสด) ──
          {
            urlPattern: /^https:\/\/.*\.firebasedatabase\.app\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-rtdb-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Firebase Auth / Firestore API ─────────────────────────────────
          {
            urlPattern: /^https:\/\/.*\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'google-apis-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 30, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Google Fonts CSS ──────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },

          // ── Google Fonts Files ────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── YouTube IFrame API ────────────────────────────────────────────
          {
            urlPattern: /^https:\/\/www\.youtube\.com\/iframe_api.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'youtube-iframe-api',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
            },
          },

          // ── noembed (title fetcher) ───────────────────────────────────────
          {
            urlPattern: /^https:\/\/noembed\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'noembed-cache',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Static app assets (JS/CSS bundles) ───────────────────────────
          {
            urlPattern: /\.(?:js|css|woff2?)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Images ───────────────────────────────────────────────────────
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // [TH] เปิดใช้ Service Worker ใน development เพื่อทดสอบ
      // [EN] Enable SW in dev for testing (disable in production if not needed)
      devOptions: {
        enabled: false, // เปิดเป็น true ถ้าต้องการทดสอบ SW ใน dev
        type: 'module',
      },
    }),
  ],
})
