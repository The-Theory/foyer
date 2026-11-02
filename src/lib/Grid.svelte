<script lang="ts">
  import { fits, kinds, type Box, type Tile } from './config'
  import { layoutCss } from './css'
  import { app } from './state.svelte'
  import Clock from './tiles/Clock.svelte'
  import Weather from './tiles/Weather.svelte'
  import LinkItem from './ui/LinkItem.svelte'

  type Mode = 'move' | 'resize'

  let grid: HTMLDivElement
  let action: { tile: Tile; mode: Mode; dx: number; dy: number; moved: boolean } | null = null
  let swallowClick = false

  const tiles = $derived(app.config.tiles)
  const cols  = $derived(app.config.theme.cols)
  const rows  = $derived(Math.max(1, ...tiles.map(t => t.y + t.h)))
  const css   = $derived(layoutCss(tiles, app.drag, rows))

  // Spare rows below the layout to drag into; they overflow the board so the page doesn't shift.
  const slotRows = $derived(Math.max(rows, (app.drag?.y ?? 0) + (app.drag?.h ?? 0)) + 3)

  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)
  const label = (tile: Tile) => tile.kind === 'link' ? tile.link.title || 'Link' : tile.kind === 'group' ? tile.title : kinds[tile.kind].name

  function cellAt(e: PointerEvent) {
    const rect  = grid.getBoundingClientRect()
    const pitch = (rect.width + app.config.theme.gap) / cols
    return { col: Math.floor((e.clientX - rect.left) / pitch), row: Math.floor((e.clientY - rect.top) / pitch) }
  }

  function boxFor(tile: Tile, mode: Mode, col: number, row: number, dx = 0, dy = 0): Box {
    return mode === 'move'
      ? { x: clamp(col - dx, 0, cols - tile.w), y: Math.max(0, row - dy), w: tile.w, h: tile.h }
      : { x: tile.x, y: tile.y, w: clamp(col - tile.x + 1, 1, cols - tile.x), h: Math.max(1, row - tile.y + 1) }
  }

  function place(tile: Tile, box: Box) {
    if (fits(box, tiles, tile.id)) Object.assign(tile, box)
  }

  function start(e: PointerEvent, tile: Tile, mode: Mode) {
    if (e.button !== 0) return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    const { col, row } = cellAt(e)
    action = { tile, mode, dx: col - tile.x, dy: row - tile.y, moved: false }
  }

  function move(e: PointerEvent) {
    if (!action) return
    const { tile, mode, dx, dy } = action
    const { col, row } = cellAt(e)
    const box = boxFor(tile, mode, col, row, dx, dy)
    const d   = app.drag ?? tile
    if (box.x === d.x && box.y === d.y && box.w === d.w && box.h === d.h) return
    action.moved = true
    app.drag = { id: tile.id, ...box, valid: fits(box, tiles, tile.id) }
  }

  function end() {
    if (!action) return
    if (app.drag) place(action.tile, app.drag)
    swallowClick = action.moved
    action   = null
    app.drag = null
  }

  function select(tile: Tile) {
    if (swallowClick) return void (swallowClick = false)
    app.sheet = { kind: 'tile', id: tile.id }
  }

  // Arrows move the focused tile, shift+arrows resize it.
  function nudge(e: KeyboardEvent, tile: Tile) {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!step) return
    e.preventDefault()
    const [sx, sy] = step
    place(tile, e.shiftKey
      ? boxFor(tile, 'resize', tile.x + tile.w - 1 + sx, tile.y + tile.h - 1 + sy)
      : boxFor(tile, 'move', tile.x + sx, tile.y + sy))
  }
</script>

<svelte:head>
  <svelte:element this={"style"}>{css}</svelte:element>
</svelte:head>

<div class="board">
  {#if app.editing}
    <div class="grid slots" aria-hidden="true">
      {#each { length: cols * slotRows }, i (i)}<div class="slot"></div>{/each}
    </div>
  {/if}

  <div class="grid" bind:this={grid}>
    {#each tiles as tile (tile.id)}
      <div
        class="tile"
        class:frame={tile.frame}
        class:selected={app.sheet?.kind === 'tile' && app.sheet.id === tile.id}
        class:invalid={app.drag?.id === tile.id && !app.drag.valid}
        data-tile={tile.id}
        data-kind={tile.kind}
      >
        {#if tile.kind === 'link'}
          <LinkItem link={tile.link} />
        {:else if tile.kind === 'group'}
          <div class="group layout-{tile.layout}">
            {#if tile.showTitle}<h2>{tile.title}</h2>{/if}
            {#if tile.links.length}
              <div class="items">{#each tile.links as link (link.id)}<LinkItem {link} />{/each}</div>
            {:else}
              <p class="hint">Add links to this group in edit mode.</p>
            {/if}
          </div>
        {:else if tile.kind === 'clock'}
          <Clock {tile} />
        {:else if tile.kind === 'weather'}
          <Weather {tile} />
        {:else}
          <textarea class="note" bind:value={tile.text} placeholder="Write something…" spellcheck="false"></textarea>
        {/if}

        {#if app.editing}
          <button
            class="handle"
            aria-label="Edit {label(tile)}. Arrow keys move, shift and arrows resize."
            onpointerdown={e => start(e, tile, 'move')}
            onpointermove={move}
            onpointerup={end}
            onpointercancel={end}
            onclick={() => select(tile)}
            onkeydown={e => nudge(e, tile)}
          >
            <span class="resize" aria-hidden="true" onpointerdown={e => start(e, tile, 'resize')}></span>
          </button>
        {/if}
      </div>
    {/each}
  </div>
</div>
