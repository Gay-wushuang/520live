import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  build: {
    sourcemap: false,
  },
  esbuild: command === 'build'
    ? {
        drop: ['console', 'debugger'],
      }
    : undefined,
  plugins: [
    react({
      babel: command === 'serve'
        ? {
            plugins: [
              'react-dev-locator',
            ],
          }
        : undefined,
    }),
    tsconfigPaths()
  ],
}))
