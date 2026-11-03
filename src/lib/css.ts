import { fonts, type Box, type Config, type Theme, type Tile } from './config'
import type { Drag } from './state.svelte'

// Theme and layout become generated stylesheets, so tiles carry no inline styles
// and user CSS can override anything.

const decls = (vars: Record<string, string | number>) => Object.entries(vars).map(([name, value]) => `${name}:${value};`).join('')

// Variables a tile can override; the page sets them all on :root.
const styleVars = (s: Theme) => ({
  '--tile':        `color-mix(in srgb, ${s.tile} ${Math.round(s.tileOpacity * 100)}%, transparent)`,
  '--blur':        `${s.blur}px`,
  '--radius':      `${s.radius}px`,
  '--text':        s.text,
  '--font':        fonts[s.font] ?? s.font,
  '--icon-size':   `${s.iconSize}cqmin`,
  '--icon-radius': `${s.iconRadius}%`,
})

export function themeCss({ theme: t, tiles }: Config) {
  const page = {
    '--bg':       t.background,
    '--image':    t.image ? `url(${JSON.stringify(t.image)})` : 'none',
    '--fit':      t.imageFit,
    '--pos':      t.imagePosition,
    '--dim':      t.dim,
    '--cols':     t.cols,
    '--cell-max': `${t.cell}px`,
    '--gap':      `${t.gap}px`,
    '--offset':   `${t.offset}px`,
    '--accent':   t.accent,
  }
  const own = tiles.filter(tile => Object.keys(tile.style).length).map(tile => `[data-tile="${tile.id}"]{${decls(styleVars({ ...t, ...tile.style }))}}`)
  return `:root{${decls({ ...page, ...styleVars(t) })}}${own.join('')}\n${t.css}`
}

const area = (b: Box) => `grid-area:${b.y + 1}/${b.x + 1}/span ${b.h}/span ${b.w}`

export interface Ring { x: number; y: number; w: number; h: number; r: string }

// ghost: where a dragged tile would land, or the box being drawn for a new tile.
export function layoutCss(tiles: Tile[], drag: Drag | null, ghost: Box | null, rows: number, ring: Ring | null) {
  const rules = tiles.map(t => `[data-tile="${t.id}"]{${area(drag?.id === t.id && drag.mode === 'resize' ? drag : t)}}`)
  if (drag?.mode === 'move') rules.push(`[data-tile="${drag.id}"]{translate:${drag.px}px ${drag.py}px}`)
  if (ghost) rules.push(`.placeholder{${area(ghost)}}`)
  if (ring) rules.push(`.ring{translate:${ring.x}px ${ring.y}px;width:${ring.w}px;height:${ring.h}px;border-radius:calc(${ring.r} + 5px)}`)
  return `:root{--rows:${rows}}${rules.join('')}`
}
