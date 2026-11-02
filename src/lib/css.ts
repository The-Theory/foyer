import { fonts, type Box, type Theme, type Tile } from './config'
import type { Drag } from './state.svelte'

// Theme and layout become generated stylesheets, so tiles carry no inline styles
// and user CSS can override anything.

export function themeCss(t: Theme) {
  const vars = {
    '--bg':        t.background,
    '--image':     t.image ? `url(${JSON.stringify(t.image)})` : 'none',
    '--fit':       t.imageFit,
    '--pos':       t.imagePosition,
    '--dim':       t.dim,
    '--cols':      t.cols,
    '--cell-max':  `${t.cell}px`,
    '--gap':       `${t.gap}px`,
    '--offset':    `${t.offset}px`,
    '--tile':      `color-mix(in srgb, ${t.tile} ${Math.round(t.tileOpacity * 100)}%, transparent)`,
    '--blur':      `${t.blur}px`,
    '--radius':    `${t.radius}px`,
    '--text':      t.text,
    '--accent':    t.accent,
    '--font':      fonts[t.font] ?? t.font,
  }
  const decls = Object.entries(vars).map(([name, value]) => `${name}:${value};`).join('')
  return `:root{${decls}}\n${t.css}`
}

const area = (b: Box) => `grid-area:${b.y + 1}/${b.x + 1}/span ${b.h}/span ${b.w}`

export interface Ring { x: number; y: number; w: number; h: number; r: string }

export function layoutCss(tiles: Tile[], drag: Drag | null, rows: number, ring: Ring | null) {
  const rules = tiles.map(t => `[data-tile="${t.id}"]{${area(drag?.id === t.id && drag.mode === 'resize' ? drag : t)}}`)
  if (drag?.mode === 'move') rules.push(`[data-tile="${drag.id}"]{translate:${drag.px}px ${drag.py}px}`, `.placeholder{${area(drag)}}`)
  if (ring) rules.push(`.ring{translate:${ring.x}px ${ring.y}px;width:${ring.w}px;height:${ring.h}px;border-radius:calc(${ring.r} + 5px)}`)
  return `:root{--rows:${rows}}${rules.join('')}`
}
