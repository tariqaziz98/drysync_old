import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// GitHub Pages serves the site from /drysync_old/, so production builds need that base path.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/drysync_old/' : '/',
  plugins: [react()],
}))
