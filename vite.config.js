import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      // 開發伺服器預設會提供專案根目錄下的任何檔案，包含 Admin SDK 金鑰。
      // 覆寫 deny 時要保留 Vite 原本的預設值（前四項）。
      deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', 'serviceAccountKey*.json']
    }
  },
  test: {
    pool: 'threads',
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
  },
})

