import { tick } from 'svelte'
import { defaultConfig, findFree, grids, kinds, newTile, parseConfig, settle, type Box, type GridSize, type Kind, type Tile } from './config'

// A pointer drag: the tile follows the pointer in pixels (live: offset, and size when resizing)
// while the box is the snapped cells it would land on.
export interface Drag extends Box { id: string; mode: 'move' | 'resize'; valid: boolean; live: { x: number; y: number; w: number; h: number } }

// A box being drawn on empty cells; once released, the user picks what goes in it.
export interface Draft extends Box { valid: boolean; picking: boolean }

export const app = $state({
  config:   defaultConfig(),
  ready:    false,
  editing:  false,
  // While editing, the panel edits the selected tiles, or the whole page when none are selected.
  selected:   [] as string[],
  focusPanel: false,
  menu:     null as 'help' | null,
  draft:    null as Draft | null,
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
export const keys = { mod: mac ? '⌘' : 'Ctrl', shift: mac ? '⇧' : 'Shift' }

// --- Tiles -------------------------------------------------------------------

export function setEditing(on: boolean) {
  app.editing = on
  app.menu    = null
  app.draft   = null
  if (!on) app.selected = []
}

export function openPage() {
  setEditing(true)
  app.selected = []
}

export const grid = () => grids[app.config.theme.squares]

// Changing how many squares the page has refits the tiles onto the new grid.
export function setSquares(size: GridSize) {
  app.config.theme.squares = size
  app.config.tiles = settle(app.config.tiles, grids[size])
}

const full = () => (app.announce = 'No room left on the board. Make a tile smaller or delete one.')

// Selects the tile and moves keyboard focus into its settings.
export function editTile(id: string) {
  setEditing(true)
  app.selected   = [id]
  app.focusPanel = true
}

export function addTile(kind: Kind, patch: Partial<Tile> = {}, at?: Box) {
  const [w, h] = kinds[kind].size
  const box = at ?? findFree(w, h, app.config.tiles, grid())
  if (!box) return full()
  const tile = { ...newTile(kind, box), ...patch } as Tile
  app.config.tiles.push(tile)
  editTile(tile.id)
}

// Opens the tile picker on the first free cell, for adding without a pointer.
export function startDraft() {
  setEditing(true)
  const box = findFree(1, 1, app.config.tiles, grid())
  if (box) app.draft = { ...box, valid: true, picking: true }
  else full()
}

export async function removeTiles(ids: string[]) {
  app.selected = app.selected.filter(id => !ids.includes(id))
  const fades = ids.map(id => tileEls[id]?.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.92 }], { duration: ms(160), easing: ease, fill: 'forwards' }).finished)
  // Background tabs may never finish the animation, so don't wait on it alone.
  await Promise.race([Promise.all(fades), new Promise(done => setTimeout(done, ms(160) + 40))])
  app.config.tiles = app.config.tiles.filter(t => !ids.includes(t.id))
}

export async function focusTile(id: string) {
  await tick()
  handleEls[id]?.focus()
}

// Clears the selection; the panel goes back to the page and focus back to the board.
export function deselect() {
  const first = app.selected[0]
  app.selected = []
  if (first) focusTile(first)
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
  app.selected = app.selected.filter(findTile)
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
