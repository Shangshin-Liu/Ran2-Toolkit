import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { proposalReviewPlugin } from './scripts/devProposalReviewApi.js'

// https://vite.dev/config/
export default defineConfig({
  // proposalReviewPlugin：技能修正提案的本機審核 API，只在 `npm run dev` 生效，不會進入正式建置
  plugins: [vue(), proposalReviewPlugin()],
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

