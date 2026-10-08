import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        catalogo: fileURLToPath(new URL('./index.html', import.meta.url)),
        registro: fileURLToPath(new URL('./register.html', import.meta.url)),
        login: fileURLToPath(new URL('./login.html', import.meta.url))
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  }
})