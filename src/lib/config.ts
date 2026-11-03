// Everything the user can customize lives in one serializable Config.

export type Icon =
  | { type: 'auto' }
  | { type: 'image'; src: string }
  | { type: 'text'; value: string }

export interface Link { id: string; title: string; url: string; icon: Icon }

export interface Box { x: number; y: number; w: number; h: number }

// The page is a fixed grid of squares, scaled to fit the window, so a layout looks
// the same on any screen. The user picks how many squares: fewer means bigger tiles.
export interface Grid { cols: number; rows: number }
export const grids = {
  s:  { cols: 16, rows: 10 },
  m:  { cols: 12, rows: 8 },
  l:  { cols: 10, rows: 6 },
  xl: { cols: 8, rows: 5 },
} satisfies Record<string, Grid>
export type GridSize = keyof typeof grids

// How a tile looks. The page sets every key; a tile stores only the ones it changes.
export interface Look {
  fill:      'none' | 'glass' | 'solid'
  fillColor: string
  fillOpacity: '5' | '10' | '20' | '40' | '70' | '100'
  frost:     'light' | 'medium' | 'heavy'
  corners:   'square' | 'soft' | 'round'
  text:      string
  font:      string
  iconSize:  's' | 'm' | 'l'
  iconShape: 'square' | 'rounded' | 'circle'
}
export type LookKey   = keyof Look
export type TileStyle = Partial<Look>
export const lookKeys = ['fill', 'fillColor', 'fillOpacity', 'frost', 'corners', 'text', 'font', 'iconSize', 'iconShape'] as const satisfies readonly LookKey[]

interface TileBase extends Box { id: string; style: TileStyle }

export type LinkTile    = TileBase & { kind: 'link'; link: Link }
export type GroupTile   = TileBase & { kind: 'group'; title: string; showTitle: boolean; layout: 'grid' | 'list'; links: Link[] }
export type ClockTile   = TileBase & { kind: 'clock'; hour12: boolean; seconds: boolean; date: boolean }
export type WeatherTile = TileBase & { kind: 'weather'; place: string; lat: number | null; lon: number | null; fahrenheit: boolean }
export type NoteTile    = TileBase & { kind: 'note'; text: string }
export type Tile = LinkTile | GroupTile | ClockTile | WeatherTile | NoteTile
export type Kind = Tile['kind']

export interface Theme extends Look {
  squares: GridSize
  background: string
  image: string
  imageFit: 'cover' | 'contain' | 'auto'
  imagePosition: string
  dim: number
  labels: 'always' | 'hover' | 'never'
  newTab: boolean
  editCorner: boolean
  pageTitle: string
  css: string
}

export interface Config { version: 1; theme: Theme; tiles: Tile[] }

export const kinds: Record<Kind, { name: string; about: string; size: [number, number] }> = {
  link:    { name: 'Link',    about: 'One site as a large icon',      size: [1, 1] },
  group:   { name: 'Group',   about: 'Several links in one tile',     size: [4, 2] },
  clock:   { name: 'Clock',   about: 'Time and date',                 size: [4, 2] },
  weather: { name: 'Weather', about: 'Current conditions for a city', size: [2, 2] },
  note:    { name: 'Note',    about: 'Text that saves as you type',   size: [2, 2] },
}

export const fonts: Record<string, string> = {
  system:  "system-ui, -apple-system, 'Segoe UI', sans-serif",
  rounded: 'ui-rounded, system-ui, sans-serif',
  serif:   'ui-serif, Georgia, serif',
  mono:    'ui-monospace, Menlo, monospace',
}

// Ready-made colors offered next to the color picker.
export const palettes = {
  background: ['#1c1c1e', '#000000', '#f4f3ef', '#1d2633', '#2b1f25', '#1f2a23', '#33291d', '#5b6470'],
  ink:        ['#ffffff', '#f2f1ed', '#1c1c1e', '#000000', '#ff8a7a', '#ffc46b', '#7fd8a6', '#8ec5ff'],
}

export const newId = () => crypto.randomUUID().slice(0, 8)

export const newLink = (title = '', url = ''): Link => ({ id: newId(), title, url, icon: { type: 'auto' } })

export function newTile(kind: Kind, box: Box): Tile {
  const base = { id: newId(), style: {}, ...box }
  switch (kind) {
    case 'link':    return { ...base, kind, link: newLink() }
    case 'group':   return { ...base, kind, title: 'New group', showTitle: true, layout: 'grid', links: [] }
    case 'clock':   return { ...base, kind, hour12: false, seconds: false, date: true }
    case 'weather': return { ...base, kind, place: '', lat: null, lon: null, fahrenheit: false }
    case 'note':    return { ...base, kind, text: '' }
  }
}

// --- Geometry ----------------------------------------------------------------

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h

export const fits = (box: Box, tiles: Tile[], skip?: string) => tiles.every(t => t.id === skip || !overlaps(box, t))

const inGrid = (b: Box, g: Grid) => b.x >= 0 && b.y >= 0 && b.x + b.w <= g.cols && b.y + b.h <= g.rows

// First free spot for a w×h tile, shrinking it down to one cell if nothing that size fits.
export function findFree(w: number, h: number, tiles: Tile[], g: Grid): Box | null {
  for (w = Math.min(w, g.cols), h = Math.min(h, g.rows); w >= 1 && h >= 1; w > h ? w-- : h--)
    for (let y = 0; y + h <= g.rows; y++)
      for (let x = 0; x + w <= g.cols; x++)
        if (fits({ x, y, w, h }, tiles)) return { x, y, w, h }
  return null
}

// The whole layout moved as one so it sits in the middle of the grid (on any axis it fits).
export function center(tiles: Tile[], g: Grid): Tile[] {
  if (!tiles.length) return tiles
  const left   = Math.min(...tiles.map(t => t.x))
  const top    = Math.min(...tiles.map(t => t.y))
  const width  = Math.max(...tiles.map(t => t.x + t.w)) - left
  const height = Math.max(...tiles.map(t => t.y + t.h)) - top
  const dx = width <= g.cols ? Math.floor((g.cols - width) / 2) - left : 0
  const dy = height <= g.rows ? Math.floor((g.rows - height) / 2) - top : 0
  return tiles.map(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
}

// Fits tiles onto a grid: the layout is re-centered if it no longer fits where it was; tiles that
// still don't fit (or overlap) move to free squares rather than vanish.
export function settle(tiles: Tile[], g: Grid): Tile[] {
  const shifted = tiles.every(t => inGrid(t, g)) ? tiles : center(tiles, g)
  const placed: Tile[] = []
  for (const [i, tile] of tiles.entries()) {
    const moved = shifted[i]
    const spot  = inGrid(moved, g) && fits(moved, placed) ? moved : findFree(tile.w, tile.h, placed, g)
    if (spot) placed.push({ ...tile, ...spot })
    else console.warn('Foyer: no room left on the board for a tile', tile)
  }
  return placed
}

// --- Links -------------------------------------------------------------------

export function hostOf(url: string) {
  try { return new URL(safeUrl(url)).hostname.replace(/^www\./, '') }
  catch { return url }
}

export const linkName = (link: Link) => link.title || hostOf(link.url)

// Bare domains get https; script URLs from imported files never run.
export function safeUrl(url: string) {
  const trimmed = url.trim()
  if (/^javascript:/i.test(trimmed)) return '#'
  return /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
}

// Pasted or dropped text that looks like an address: a scheme, or a bare domain.
export const isUrl = (text: string) => /^(https?:\/\/\S+|[\w-]+(\.[\w-]+)+(\/\S*)?)$/i.test(text.trim())

export const favicon = (url: string) => `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(hostOf(url))}`

// --- Defaults & parsing ------------------------------------------------------

export function defaultConfig(): Config {
  const at = (x: number, y: number, w = 1, h = 1) => ({ x, y, w, h })
  const link = (x: number, title: string, url: string) => ({ ...newTile('link', at(x, 3)), link: newLink(title, url) }) as LinkTile
  return {
    version: 1,
    theme: {
      squares: 'm', background: '#1c1c1e', image: '', imageFit: 'cover', imagePosition: 'center', dim: 0,
      fill: 'glass', fillColor: '#ffffff', fillOpacity: '10', frost: 'medium', corners: 'soft', text: '#f2f1ed', font: 'system', iconSize: 'm', iconShape: 'rounded',
      labels: 'hover', newTab: false, editCorner: true, pageTitle: 'New Tab', css: '',
    },
    tiles: [
      { ...newTile('clock', at(2, 1, 4, 2)), style: { fill: 'none' } } as ClockTile,
      newTile('weather', at(6, 1, 2, 2)),
      newTile('note', at(8, 1, 2, 2)),
      link(2, 'Claude', 'claude.ai'),
      link(3, 'Translate', 'translate.google.com'),
      link(4, 'GitHub', 'github.com'),
      link(5, 'Gmail', 'mail.google.com'),
      link(6, 'Pinterest', 'pinterest.com'),
      link(7, 'Spotify', 'open.spotify.com'),
      link(8, 'YouTube', 'youtube.com'),
      link(9, 'Modrinth', 'modrinth.com'),
      { ...newTile('group', at(2, 4, 4, 2)), title: 'College' } as GroupTile,
      { ...newTile('group', at(6, 4, 4, 2)), title: 'Personal', links: [newLink('Games', 'games.traced.red')] } as GroupTile,
    ],
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Fills anything missing with defaults, so old or hand-edited files keep working.
export function parseConfig(json: string): Config {
  const data: unknown = JSON.parse(json)
  if (!isRecord(data) || !Array.isArray(data.tiles) || !isRecord(data.theme)) throw new Error('This file is not a Foyer layout.')

  // Keys unknown to this version, or of the wrong type (older layouts stored sizes as numbers), fall back to defaults.
  const saved    = data.theme
  const defaults = defaultConfig().theme
  const theme    = Object.fromEntries(Object.entries(defaults).map(([k, v]) => [k, typeof saved[k] === typeof v ? saved[k] : v])) as unknown as Theme
  const isLook   = ([k, v]: [string, unknown]) => (lookKeys as readonly string[]).includes(k) && typeof v === 'string'

  const tiles = data.tiles.filter(isRecord).flatMap(t => {
    const box = { x: t.x, y: t.y, w: t.w, h: t.h }
    if (!(typeof t.kind === 'string' && t.kind in kinds) || !Object.values(box).every(Number.isInteger)) return []
    const style: TileStyle = Object.fromEntries(Object.entries(isRecord(t.style) ? t.style : {}).filter(isLook))
    if (t.frame === false) style.fill = 'none' // layouts from before tiles had a fill choice
    if (style.fill === 'solid' && !style.fillOpacity) style.fillOpacity = '100' // solid used to mean opaque
    const { frame: _frame, ...rest } = t
    return [{ ...newTile(t.kind as Kind, box as Box), ...rest, style } as Tile]
  })
  if (!(theme.squares in grids)) theme.squares = defaults.squares
  if (theme.fill === 'solid' && !('fillOpacity' in saved)) theme.fillOpacity = '100'
  return { version: 1, theme, tiles: settle(tiles, grids[theme.squares]) }
}
