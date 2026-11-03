// Everything the user can customize lives in one serializable Config.

export type Icon =
  | { type: 'auto' }
  | { type: 'image'; src: string }
  | { type: 'text'; value: string }

export interface Link { id: string; title: string; url: string; icon: Icon }

export interface Box { x: number; y: number; w: number; h: number }

// Appearance settings a single tile can override; unset keys follow the page.
export const styleKeys = ['tile', 'tileOpacity', 'blur', 'radius', 'text', 'font', 'iconSize', 'iconRadius'] as const
export type StyleKey  = (typeof styleKeys)[number]
export type TileStyle = Partial<Pick<Theme, StyleKey>>

interface TileBase extends Box { id: string; frame: boolean; style: TileStyle }

export type LinkTile    = TileBase & { kind: 'link'; link: Link }
export type GroupTile   = TileBase & { kind: 'group'; title: string; showTitle: boolean; layout: 'grid' | 'list'; links: Link[] }
export type ClockTile   = TileBase & { kind: 'clock'; hour12: boolean; seconds: boolean; date: boolean }
export type WeatherTile = TileBase & { kind: 'weather'; place: string; lat: number | null; lon: number | null; fahrenheit: boolean }
export type NoteTile    = TileBase & { kind: 'note'; text: string }
export type Tile = LinkTile | GroupTile | ClockTile | WeatherTile | NoteTile
export type Kind = Tile['kind']

export interface Theme {
  background: string
  image: string
  imageFit: 'cover' | 'contain' | 'auto'
  imagePosition: string
  dim: number
  cols: number
  cell: number
  gap: number
  align: 'top' | 'center'
  offset: number
  tile: string
  tileOpacity: number
  blur: number
  radius: number
  text: string
  accent: string
  font: string
  iconSize: number
  iconRadius: number
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

export const newId = () => crypto.randomUUID().slice(0, 8)

export const newLink = (title = '', url = ''): Link => ({ id: newId(), title, url, icon: { type: 'auto' } })

export function newTile(kind: Kind, box: Box): Tile {
  const base = { id: newId(), frame: true, style: {}, ...box }
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

export function findFree(w: number, h: number, cols: number, tiles: Tile[]): Box {
  w = Math.min(w, cols)
  for (let y = 0; ; y++)
    for (let x = 0; x + w <= cols; x++)
      if (fits({ x, y, w, h }, tiles)) return { x, y, w, h }
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
  const link = (x: number, title: string, url: string) => ({ ...newTile('link', at(x, 2)), link: newLink(title, url) }) as LinkTile
  return {
    version: 1,
    theme: {
      background: '#222224', image: '', imageFit: 'cover', imagePosition: 'center', dim: 0,
      cols: 8, cell: 88, gap: 14, align: 'center', offset: 96,
      tile: '#ffffff', tileOpacity: 0.055, blur: 16, radius: 16,
      text: '#f2f1ed', accent: '#f2f1ed', font: 'system', iconSize: 44, iconRadius: 22,
      labels: 'hover', newTab: false, editCorner: true, pageTitle: 'New Tab', css: '',
    },
    tiles: [
      { ...newTile('clock', at(0, 0, 4, 2)), frame: false } as ClockTile,
      newTile('weather', at(4, 0, 2, 2)),
      newTile('note', at(6, 0, 2, 2)),
      link(0, 'Claude', 'claude.ai'),
      link(1, 'Translate', 'translate.google.com'),
      link(2, 'GitHub', 'github.com'),
      link(3, 'Gmail', 'mail.google.com'),
      link(4, 'Pinterest', 'pinterest.com'),
      link(5, 'Spotify', 'open.spotify.com'),
      link(6, 'YouTube', 'youtube.com'),
      link(7, 'Modrinth', 'modrinth.com'),
      { ...newTile('group', at(0, 3, 4, 2)), title: 'College' } as GroupTile,
      { ...newTile('group', at(4, 3, 4, 2)), title: 'Personal', links: [newLink('Games', 'games.traced.red')] } as GroupTile,
    ],
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

// Fills anything missing with defaults, so old or hand-edited files keep working.
export function parseConfig(json: string): Config {
  const data: unknown = JSON.parse(json)
  if (!isRecord(data) || !Array.isArray(data.tiles) || !isRecord(data.theme)) throw new Error('This file is not a Foyer layout.')

  const tiles = data.tiles.filter(isRecord).flatMap(t => {
    const box = { x: t.x, y: t.y, w: t.w, h: t.h }
    if (!(typeof t.kind === 'string' && t.kind in kinds) || !Object.values(box).every(Number.isInteger)) return []
    return [{ ...newTile(t.kind as Kind, box as Box), ...t } as Tile]
  })
  return { version: 1, theme: { ...defaultConfig().theme, ...data.theme }, tiles }
}
