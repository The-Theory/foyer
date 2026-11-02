import { defaultConfig, parseConfig, type Box, type Tile } from './config'

export interface Drag extends Box { id: string; valid: boolean }

export type Sheet = { kind: 'theme' } | { kind: 'tile'; id: string } | null

export const app = $state({
  config:   defaultConfig(),
  ready:    false,
  editing:  false,
  sheet:    null as Sheet,
  drag:     null as Drag | null,
  launcher: null as string | null,
})

export const findTile = (id: string): Tile | undefined => app.config.tiles.find(t => t.id === id)

// --- Persistence -------------------------------------------------------------
// The extension uses browser.storage.local; plain `npm run dev` falls back to localStorage.

const ext = typeof browser !== 'undefined' && browser.storage ? browser.storage.local : null
const key = 'config'
let saved = ''

async function read(name: string): Promise<string | undefined> {
  if (!ext) return localStorage.getItem(name) ?? undefined
  const value = (await ext.get(name))[name]
  return typeof value === 'string' ? value : undefined
}

function write(name: string, json: string) {
  if (ext) ext.set({ [name]: json })
  else localStorage.setItem(name, json)
}

function save(json: string) {
  saved = json
  write(key, json)
}

export async function load() {
  const json = await read(key)
  if (json) {
    try { app.config = parseConfig(json) }
    catch (error) {
      console.warn('Foyer: stored layout unreadable, kept a copy under "config-backup"', error)
      write('config-backup', json)
    }
  }
  saved = JSON.stringify(app.config)
  app.ready = true
}

export const flush = () => {
  const json = JSON.stringify(app.config)
  if (json !== saved) save(json)
}

// Call once from a component: saves edits shortly after they happen and
// picks up edits made in other open tabs.
export function persist() {
  let timer = 0
  $effect(() => {
    const json = JSON.stringify(app.config)
    if (!app.ready || json === saved) return
    clearTimeout(timer)
    timer = window.setTimeout(() => save(json), 150)
  })

  if (!ext) return
  const onChange = (changes: Record<string, browser.storage.StorageChange>, area: string) => {
    const value: unknown = changes[key]?.newValue
    if (area !== 'local' || typeof value !== 'string' || value === saved) return
    saved = value
    app.config = parseConfig(value)
  }
  browser.storage.onChanged.addListener(onChange)
  $effect(() => () => browser.storage.onChanged.removeListener(onChange))
}
