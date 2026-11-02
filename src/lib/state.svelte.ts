import { tick } from 'svelte'
import { defaultConfig, findFree, kinds, newTile, parseConfig, type Box, type Kind, type Tile } from './config'

// A pointer drag: the tile follows the pointer by (px, py) while the box is where it would land.
export interface Drag extends Box { id: string; mode: 'move' | 'resize'; valid: boolean; px: number; py: number }

export type Sheet = { kind: 'theme' } | { kind: 'tile'; id: string } | null

export const app = $state({
  config:   defaultConfig(),
  ready:    false,
  editing:  false,
  sheet:    null as Sheet,
  menu:     null as 'add' | 'help' | null,
  palette:  null as string | null,
  drag:     null as Drag | null,
  grab:     null as { id: string; origin: Box } | null,
  keyboard: false,
  announce: '',
})

export const findTile = (id: string): Tile | undefined => app.config.tiles.find(t => t.id === id)

// Rendered tile and edit-handle elements, filled by bind:this in Grid.
export const tileEls:   Record<string, HTMLElement | null> = {}
export const handleEls: Record<string, HTMLElement | null> = {}

// --- Motion ------------------------------------------------------------------

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
export const ms = (duration: number) => (reduced ? 0 : duration)
export const ease = 'cubic-bezier(.2, .9, .25, 1)'

// --- Keys --------------------------------------------------------------------

const mac = /Mac|iPhone|iPad/.test(navigator.platform)
export const keys = { mod: mac ? '⌘' : 'Ctrl', alt: mac ? '⌥' : 'Alt', shift: mac ? '⇧' : 'Shift' }

// --- Tiles -------------------------------------------------------------------

export function setEditing(on: boolean) {
  app.editing = on
  app.menu    = null
  if (!on) app.sheet = null
}

export function openAppearance() {
  setEditing(true)
  app.sheet = { kind: 'theme' }
}

export function addTile(kind: Kind, patch: Partial<Tile> = {}, at?: Box) {
  const [w, h] = kinds[kind].size
  const box  = at ?? findFree(w, h, app.config.theme.cols, app.config.tiles)
  const tile = { ...newTile(kind, box), ...patch } as Tile
  app.config.tiles.push(tile)
  setEditing(true)
  app.sheet = { kind: 'tile', id: tile.id }
  return tile
}

export async function removeTile(id: string) {
  const el = tileEls[id]
  if (app.sheet?.kind === 'tile' && app.sheet.id === id) app.sheet = null
  const fade = el?.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.92 }], { duration: ms(160), easing: ease, fill: 'forwards' })
  // Background tabs may never finish the animation, so don't wait on it alone.
  await Promise.race([fade?.finished, new Promise(done => setTimeout(done, ms(160) + 40))])
  app.config.tiles = app.config.tiles.filter(t => t.id !== id)
}

export async function focusTile(id: string) {
  await tick()
  handleEls[id]?.focus()
}

export function closeSheet() {
  const sheet = app.sheet
  app.sheet = null
  if (sheet?.kind === 'tile') focusTile(sheet.id)
}

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

// --- Undo --------------------------------------------------------------------
// Each save remembers the previous state; saves less than a second apart
// (typing, nudging) collapse into one step.

const undoStack: string[] = []
const redoStack: string[] = []
let lastStep = 0

function save(json: string) {
  if (saved && Date.now() - lastStep > 1000) {
    undoStack.push(saved)
    if (undoStack.length > 100) undoStack.shift()
    redoStack.length = 0
  }
  lastStep = Date.now()
  saved = json
  write(key, json)
}

function adopt(json: string) {
  app.config = parseConfig(json)
  saved = JSON.stringify(app.config)
}

function travel(from: string[], to: string[], done: string) {
  flush()
  const json = from.pop()
  if (!json) return
  to.push(saved)
  adopt(json)
  write(key, saved)
  lastStep     = 0
  app.sheet    = null
  app.announce = done
}

export const undo = () => travel(undoStack, redoStack, 'Undone')
export const redo = () => travel(redoStack, undoStack, 'Redone')

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
    adopt(value)
  }
  browser.storage.onChanged.addListener(onChange)
  $effect(() => () => browser.storage.onChanged.removeListener(onChange))
}
