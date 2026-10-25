import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  base: '/Greek_yokk/',
  plugins: [vue()],
  build: {
    rollupOptions: {
      input: {main: resolve(__dirname, 'index.html'), local: resolve(__dirname, 'local.html')}
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: false
  }
})
