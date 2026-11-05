// Turns the Firefox build in dist/ into a Chrome build in dist-chrome/. Same files, with
// the manifest keys Chrome doesn't take swapped out.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

rmSync('dist-chrome', { recursive: true, force: true })
cpSync('dist', 'dist-chrome', { recursive: true })

const manifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'))
delete manifest.browser_specific_settings
delete manifest.chrome_settings_overrides // Chrome only accepts a web address as the homepage
manifest.icons = { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' } // no SVG icons in Chrome
manifest.minimum_chrome_version = '120'
writeFileSync('dist-chrome/manifest.json', JSON.stringify(manifest, null, 2))
