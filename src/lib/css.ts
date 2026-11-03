import { board, fonts, type Box, type Config, type Look, type Tile } from './config'
import type { Drag } from './state.svelte'

// Theme and layout become generated stylesheets, so tiles carry no inline styles
// and user CSS can override anything.

const decls = (vars: Record<string, string | number>) => Object.entries(vars).map(([name, value]) => `${name}:${value};`).join('')

// Each look choice is a fixed recipe, sized relative to the cell so it reads the same at any window size.
const fills   = { none: 'transparent', glass: (c: string) => `color-mix(in srgb, ${c} 9%, transparent)`, solid: (c: string) => c }
const corners = { square: 0, soft: 0.16, round: 0.5 } // share of one cell
const icons   = { s: '30cqmin', m: '44cqmin', l: '62cqmin' }
const shapes  = { square: '6%', rounded: '24%', circle: '50%' }

const lookVars = (l: Look) => ({
  '--fill':        l.fill === 'none' ? fills.none : fills[l.fill](l.fillColor),
  '--blur':        l.fill === 'glass' ? '18px' : '0px',
  '--corner':      corners[l.corners],
  '--text':        l.text,
  '--font':        fonts[l.font] ?? l.font,
  '--icon-size':   icons[l.iconSize],
  '--icon-radius': shapes[l.iconShape],
})

export function themeCss({ theme: t, tiles }: Config) {
  const page = {
    '--bg':    t.background,
    '--image': t.image ? `url(${JSON.stringify(t.image)})` : 'none',
    '--fit':   t.imageFit,
    '--pos':   t.imagePosition,
    '--dim':   t.dim,
    '--cols':  board.cols,
    '--rows':  board.rows,
  }
  const own = tiles.filter(tile => Object.keys(tile.style).length).map(tile => `[data-tile="${tile.id}"]{${decls(lookVars({ ...t, ...tile.style }))}}`)
  return `:root{${decls({ ...page, ...lookVars(t) })}}${own.join('')}\n${t.css}`
}

const area = (b: Box) => `grid-area:${b.y + 1}/${b.x + 1}/span ${b.h}/span ${b.w}`

export interface Ring { x: number; y: number; w: number; h: number; r: string }

// ghost: where a dragged tile would land, or the box being drawn for a new tile.
export function layoutCss(tiles: Tile[], drag: Drag | null, ghost: Box | null, ring: Ring | null) {
  const rules = tiles.map(t => `[data-tile="${t.id}"]{${area(t)}}`)
  if (drag) {
    const { x, y, w, h } = drag.live
    rules.push(`[data-tile="${drag.id}"]{translate:${x}px ${y}px;${w ? `width:${w}px;height:${h}px` : ''}}`)
  }
  if (ghost) rules.push(`.placeholder{${area(ghost)}}`)
  if (ring) rules.push(`.ring{translate:${ring.x}px ${ring.y}px;width:${ring.w}px;height:${ring.h}px;border-radius:calc(${ring.r} + 5px)}`)
  return rules.join('')
}
