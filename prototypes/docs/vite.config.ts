import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// ────────────────────────────────────────────────────────────────────
// Vite config
// ────────────────────────────────────────────────────────────────────
// Modes:
//   development  → npm run dev         (default, uses .env + .env.local)
//   qa           → npm run build:qa    (uses .env.qa)
//   production   → npm run build:prod  (uses .env.production)
//
// All env vars must be VITE_-prefixed to be exposed to the client.
// ────────────────────────────────────────────────────────────────────

export default defineConfig(({ mode }) => {
  // Load env vars for the current mode (available as process.env inside this config)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [vue(), tailwindcss()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      host: true,
      port: 5173,
      strictPort: false,
    },

    preview: {
      host: true,
      port: 4173,
    },

    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      minify: mode === 'production',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia'],
            query: ['@tanstack/vue-query', '@tanstack/vue-table'],
            auth: ['@auth0/auth0-vue'],
          },
        },
      },
    },

    // Expose the resolved app version to the client
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version || '0.0.0'),
    },
  };
});
