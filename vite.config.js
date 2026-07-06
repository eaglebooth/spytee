import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const appProxy = {
  '/api/teepublic-tags': {
    target: 'https://r.jina.ai',
    changeOrigin: true,
    rewrite: () => '/http://www.teepublic.com/tag-directory',
  },
  '/api/teepublic-best-sellers/': {
    target: 'https://r.jina.ai',
    changeOrigin: true,
    rewrite: (path) => {
      const product = path.replace('/api/teepublic-best-sellers/', '')
      return `/http://www.teepublic.com/${product}`
    },
  },
  '/api/redbubble-index': {
    target: 'https://search.brave.com',
    changeOrigin: true,
    rewrite: (path) => path.replace('/api/redbubble-index', '/search'),
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: appProxy,
  },
  preview: {
    proxy: appProxy,
  },
})
