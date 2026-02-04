import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    nodePolyfills({
      // To add only specific polyfills, add them here
      include: ['buffer', 'crypto', 'util', 'stream', 'process', 'events'],
      // Whether to polyfill `global`
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill `node:` protocol
      protocolImports: true,
    }),
  ],
  define: {
    'process.env': {},
    'process.version': JSON.stringify('v16.14.0'),
    'process.browser': true,
    'process.platform': JSON.stringify('browser'),
  },
})
