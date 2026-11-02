import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Relative paths so the built page works from moz-extension:// URLs.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  build: { modulePreload: { polyfill: false } },
})
