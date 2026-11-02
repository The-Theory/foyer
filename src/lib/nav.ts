// Arrow-key navigation between links (viewing) or tiles (editing), by on-screen position.

export type Layer = 'view' | 'edit'
export type Direction = 'left' | 'right' | 'up' | 'down'

const targets = new Map<HTMLElement, Layer>()
let last: HTMLElement | null = null

// Svelte action: use:navTarget={'view'} registers an element for arrow navigation.
export function navTarget(el: HTMLElement, layer: Layer) {
  targets.set(el, layer)
  const remember = () => (last = el)
  el.addEventListener('focus', remember)
  return {
    update: (next: Layer) => targets.set(el, next),
    destroy: () => {
      targets.delete(el)
      el.removeEventListener('focus', remember)
    },
  }
}

// First target of a layer inside a container, e.g. a tile's first link.
export const firstIn = (container: Element, layer: Layer) => [...targets].find(([el, l]) => l === layer && container.contains(el))?.[0]

export const isNavTarget = (el: EventTarget | null) => el instanceof HTMLElement && targets.has(el)

export const arrows: Record<string, Direction> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })

// Nearest target in the direction, favoring ones in line with the current one.
export function step(layer: Layer, dir: Direction, active: Element | null) {
  const pool = [...targets].filter(([el, l]) => l === layer && el.isConnected).map(([el]) => el)
  const from = active instanceof HTMLElement && targets.has(active) ? active : last?.isConnected ? last : null
  if (!from) return pool.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left)[0]

  const a = center(from.getBoundingClientRect())
  let best: HTMLElement | undefined
  let bestScore = Infinity
  for (const el of pool) {
    if (el === from) continue
    const b  = center(el.getBoundingClientRect())
    const dx = b.x - a.x
    const dy = b.y - a.y
    const [ahead, aside] = { left: [-dx, dy], right: [dx, dy], up: [-dy, dx], down: [dy, dx] }[dir]
    if (ahead < 1) continue
    const score = ahead + Math.abs(aside) * 3
    if (score < bestScore) [best, bestScore] = [el, score]
  }
  return best
}

// Svelte action: focuses the element once it mounts (native autofocus skips when focus is elsewhere).
export function focusOnMount(el: HTMLElement, on = true) {
  if (on) queueMicrotask(() => el.focus())
}
