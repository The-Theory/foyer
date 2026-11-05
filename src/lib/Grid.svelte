<script lang="ts">
  import { tick, untrack } from 'svelte'
  import { fade, scale } from 'svelte/transition'
  import { fits, isUrl, kinds, linkName, newLink, type Box, type Kind, type Tile } from './config'
  import { layoutCss, type Ring } from './css'
  import { arrows, firstIn, focusOnMount, isNavTarget, navTarget } from './nav'
  import { addTile, app, ease, editTile, grid as gridSize, handleEls, keys, ms, removeTiles, tileEls } from './state.svelte'
  import Clock from './tiles/Clock.svelte'
  import Weather from './tiles/Weather.svelte'
  import LinkItem from './ui/LinkItem.svelte'

  type Mode = 'move' | 'resize'
  // Which sides a resize drags: compass letters, e.g. 'se' for the bottom-right corner.
  const edges = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const
  type Edge = (typeof edges)[number]

  let board!: HTMLDivElement
  let grid: HTMLDivElement
  let action: { tile: Tile; mode: Mode; edge: Edge; x0: number; y0: number; w0: number; h0: number; moved: boolean } | null = null
  let swallowClick = false
  let dragInside   = false

  const tiles = $derived(app.config.tiles)
  const cols  = $derived(gridSize().cols)
  const rows  = $derived(gridSize().rows)

  // One square's size in whole pixels, measured from the page's free area. Measured in JS rather than
  // with CSS container units, which Firefox doesn't recompute while the page's padding animates.
  let cell = $state(0)
  $effect(() => {
    const [c, r] = [cols, rows]
    const observer = new ResizeObserver(([entry]) => (cell = Math.floor(Math.min(entry.contentRect.width / c, entry.contentRect.height / r))))
    if (board.parentElement) observer.observe(board.parentElement)
    return () => observer.disconnect()
  })
  const ghost = $derived(app.drag ?? app.draft)

  // Cells under a tile, so their empty-square markers don't show through see-through tiles.
  const taken = $derived(new Set(tiles.flatMap(t => Array.from({ length: t.w * t.h }, (_, k) => (t.y + Math.floor(k / t.w)) * cols + t.x + (k % t.w)))))

  const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)
  const label = (tile: Tile) => (tile.kind === 'link' ? linkName(tile.link) || 'Link' : tile.kind === 'group' ? tile.title : kinds[tile.kind].name)
  const lifted = (tile: Tile) => app.grab?.id === tile.id || (app.drag?.id === tile.id && app.drag.mode === 'move')

  // --- Focus ring --------------------------------------------------------------
  // One ring glides between whatever has keyboard focus instead of per-element outlines.

  let ring    = $state<Ring | null>(null)
  let jump    = $state(true)
  let focused: HTMLElement | null = null
  let focusedTile = ''

  function measure(el: HTMLElement): Ring | null {
    const a = board.getBoundingClientRect()
    const b = el.getBoundingClientRect()
    if (!b.width) return null
    return { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height, r: `${parseFloat(getComputedStyle(el).borderRadius) || 0}px` }
  }

  function onfocusin(e: FocusEvent) {
    if (!isNavTarget(e.target)) return
    focused = e.target as HTMLElement
    focusedTile = (focused.closest('[data-tile]') as HTMLElement | null)?.dataset.tile ?? ''
    jump    = !ring
    ring    = measure(focused)
    requestAnimationFrame(() => (jump = false))
  }

  function onfocusout(e: FocusEvent) {
    if (board.contains(e.relatedTarget as Node | null)) return
    focused = null
    ring    = null
  }

  // Switching modes keeps focus on the same tile: its handle while editing, its first link after.
  $effect(() => {
    const editing = app.editing
    untrack(async () => {
      const id = focusedTile
      if (!id) return
      await tick()
      const active = document.activeElement
      if (active && active !== document.body && !board.contains(active)) return
      const el = tileEls[id]
      ;(editing ? handleEls[id] : el && firstIn(el, 'view'))?.focus()
    })
  })

  const css = $derived(layoutCss(tiles, app.drag, ghost, app.keyboard ? ring : null, cell))

  // --- Glide on layout changes (FLIP) ------------------------------------------

  const layoutKey = $derived(
    tiles.map(t => `${t.id}:${t.x},${t.y},${t.w},${t.h}`).join('|') + `|${app.drag?.id ?? ''}|${cols}`,
  )

  let before = new Map<string, DOMRect>()

  $effect.pre(() => {
    layoutKey
    before = new Map(Object.entries(tileEls).flatMap(([id, el]) => (el?.isConnected ? [[id, el.getBoundingClientRect()]] : [])))
  })

  $effect(() => {
    layoutKey
    if (focused?.isConnected) ring = measure(focused)
    for (const [id, el] of Object.entries(tileEls)) {
      const a = before.get(id)
      if (!a || !el?.isConnected || app.drag?.id === id) continue
      const b = el.getBoundingClientRect()
      if (Math.abs(a.left - b.left) + Math.abs(a.top - b.top) + Math.abs(a.width - b.width) + Math.abs(a.height - b.height) < 1) continue
      el.animate(
        [
          { translate: `${a.left - b.left}px ${a.top - b.top}px`, width: `${a.width}px`, height: `${a.height}px` },
          { translate: '0 0', width: `${b.width}px`, height: `${b.height}px` },
        ],
        { duration: ms(260), easing: ease },
      )
    }
  })

  // --- Pointer dragging --------------------------------------------------------

  // Cells have no gaps between them (tiles are inset inside their cells), so one cell is width / cols.
  const pitch = () => grid.getBoundingClientRect().width / cols

  function cellAt(e: MouseEvent) {
    const rect = grid.getBoundingClientRect()
    return { x: clamp(Math.floor((e.clientX - rect.left) / pitch()), 0, cols - 1), y: clamp(Math.floor((e.clientY - rect.top) / pitch()), 0, rows - 1) }
  }

  function boxFor(tile: Tile, mode: Mode, dx: number, dy: number, edge: Edge = 'se'): Box {
    if (mode === 'move') return { x: clamp(tile.x + dx, 0, cols - tile.w), y: clamp(tile.y + dy, 0, rows - tile.h), w: tile.w, h: tile.h }
    let { x, y, w, h } = tile
    if (edge.includes('e')) w = clamp(w + dx, 1, cols - x)
    if (edge.includes('s')) h = clamp(h + dy, 1, rows - y)
    if (edge.includes('w')) [x, w] = [clamp(x + dx, 0, x + w - 1), x + w - clamp(x + dx, 0, x + w - 1)]
    if (edge.includes('n')) [y, h] = [clamp(y + dy, 0, y + h - 1), y + h - clamp(y + dy, 0, y + h - 1)]
    return { x, y, w, h }
  }

  function place(tile: Tile, box: Box) {
    if (!fits(box, tiles, tile.id)) return false
    Object.assign(tile, box)
    return true
  }

  function start(e: PointerEvent, tile: Tile, mode: Mode, edge: Edge = 'se') {
    if (e.button !== 0) return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    const rect = tileEls[tile.id]?.getBoundingClientRect()
    action = { tile, mode, edge, x0: e.clientX, y0: e.clientY, w0: rect?.width ?? 0, h0: rect?.height ?? 0, moved: false }
  }

  function move(e: PointerEvent) {
    if (!action) return
    const { tile, mode, edge, x0, y0, w0, h0 } = action
    const px = e.clientX - x0
    const py = e.clientY - y0
    if (!action.moved && Math.hypot(px, py) < 4) return
    action.moved = true
    const cell = pitch()
    const box  = boxFor(tile, mode, Math.round(px / cell), Math.round(py / cell), edge)
    app.drag = { id: tile.id, ...box, mode, valid: fits(box, tiles, tile.id), live: mode === 'move' ? { x: px, y: py, w: 0, h: 0 } : stretch(edge, px, py, w0, h0, cell - (cell * tile.w - w0)) }
  }

  // Resizing in pixels: the dragged edges follow the pointer, never smaller than one cell.
  function stretch(edge: Edge, px: number, py: number, w0: number, h0: number, min: number) {
    const w   = edge.includes('e') ? w0 + px : edge.includes('w') ? w0 - px : w0
    const h   = edge.includes('s') ? h0 + py : edge.includes('n') ? h0 - py : h0
    const live = { x: 0, y: 0, w: Math.max(min, w), h: Math.max(min, h) }
    if (edge.includes('w')) live.x = w0 - live.w
    if (edge.includes('n')) live.y = h0 - live.h
    return live
  }

  function end() {
    if (!action) return
    if (app.drag?.valid) place(action.tile, app.drag)
    swallowClick = action.moved
    action   = null
    app.drag = null
  }

  // Click selects one tile; Shift or ⌘/Ctrl click adds or removes it from the selection.
  function toggle(id: string) {
    app.selected = app.selected.includes(id) ? app.selected.filter(s => s !== id) : [...app.selected, id]
  }

  function select(e: MouseEvent, tile: Tile) {
    if (swallowClick) return void (swallowClick = false)
    if (e.detail === 0) return // keyboard activation is handled in onkey
    if (e.shiftKey || e.metaKey || e.ctrlKey) toggle(tile.id)
    else app.selected = [tile.id]
  }

  // --- Drawing a new tile on empty cells ----------------------------------------
  // Press on an empty cell and drag to size the tile, then pick what goes in it.

  let anchor: { x: number; y: number } | null = null
  let ghostEl  = $state<HTMLDivElement>()
  // Opens above the box when there isn't room below it for the list and the toolbar, and toward
  // the left when it would run past the board's right edge, where the settings panel starts.
  const pickRect = $derived(app.draft?.picking && ghostEl ? ghostEl.getBoundingClientRect() : null)
  const pickUp   = $derived(pickRect ? pickRect.bottom + 300 > innerHeight : false)
  const pickLeft = $derived(pickRect ? pickRect.left + 180 > board.getBoundingClientRect().right : false)
  const kindList = Object.entries(kinds) as [Kind, (typeof kinds)[Kind]][]
  const pickItems: HTMLButtonElement[] = []

  function sketch(e: PointerEvent) {
    if (!anchor) return
    const c   = cellAt(e)
    const box = { x: Math.min(anchor.x, c.x), y: Math.min(anchor.y, c.y), w: Math.abs(c.x - anchor.x) + 1, h: Math.abs(c.y - anchor.y) + 1 }
    app.draft = { ...box, valid: fits(box, tiles), picking: false }
  }

  function drawStart(e: PointerEvent) {
    if (e.button !== 0) return
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    app.selected = []
    anchor = cellAt(e)
    sketch(e)
  }

  function drawEnd() {
    if (!anchor) return
    anchor = null
    if (app.draft?.valid) app.draft.picking = true
    else app.draft = null
  }

  // A single cell grows to the kind's usual size when there's room; a drawn box is kept as drawn.
  function create(kind: Kind) {
    const d = app.draft
    if (!d) return
    const [w, h] = kinds[kind].size
    const grown  = { x: d.x, y: d.y, w: Math.min(w, cols - d.x), h: Math.min(h, rows - d.y) }
    const box    = d.w * d.h === 1 && fits(grown, tiles) ? grown : { x: d.x, y: d.y, w: d.w, h: d.h }
    app.draft = null
    addTile(kind, {}, box)
  }

  function pickKey(e: KeyboardEvent, i: number) {
    const n     = Number(e.key)
    const focus = (j: number) => pickItems[(j + kindList.length) % kindList.length]?.focus()
    if (n >= 1 && n <= kindList.length) create(kindList[n - 1][0])
    else if (e.key === 'ArrowDown') focus(i + 1)
    else if (e.key === 'ArrowUp') focus(i - 1)
    else if (e.key === 'Escape') app.draft = null
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const leavePicker = (e: FocusEvent) => {
    if (app.draft?.picking && !(e.currentTarget as Element).contains(e.relatedTarget as Node | null)) app.draft = null
  }

  // --- Keyboard: Space picks up, arrows move, shift+arrows resize ---------------

  function onkey(e: KeyboardEvent, tile: Tile) {
    const grabbed = app.grab?.id === tile.id
    const dir     = arrows[e.key]

    if (e.key === ' ' || (e.key === 'Enter' && grabbed)) {
      app.grab     = grabbed ? null : { id: tile.id, origin: { x: tile.x, y: tile.y, w: tile.w, h: tile.h } }
      app.announce = grabbed ? `Dropped ${label(tile)}.` : `Picked up ${label(tile)}. Arrow keys move it, ${keys.shift} and arrow keys resize it, Space drops it.`
    } else if (e.key === 'Enter' && e.shiftKey) {
      toggle(tile.id)
    } else if (e.key === 'Enter') {
      editTile(tile.id)
    } else if (e.key === 'Escape' && grabbed && app.grab) {
      Object.assign(tile, app.grab.origin)
      app.grab     = null
      app.announce = 'Move canceled.'
    } else if (dir && grabbed) {
      const [dx, dy] = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir]
      const mode     = e.shiftKey ? 'resize' : 'move'
      // Moving hops over occupied cells to the next free spot; resizing stops at neighbors.
      const reach    = mode === 'move' ? Math.max(cols, rows + 3) : 1
      let moved = false
      for (let k = 1; k <= reach && !moved; k++) {
        const box = boxFor(tile, mode, dx * k, dy * k)
        if (box.x === tile.x && box.y === tile.y && box.w === tile.w && box.h === tile.h) break
        moved = place(tile, box)
      }
      if (!moved) app.announce = mode === 'move' ? 'No free space that way.' : 'That space is taken.'
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !grabbed) {
      const ids = app.selected.includes(tile.id) ? app.selected : [tile.id]
      removeTiles(ids)
      app.announce = `Deleted ${ids.length > 1 ? `${ids.length} tiles` : label(tile)}. ${keys.mod} Z brings it back.`
    } else return

    e.preventDefault()
    e.stopPropagation()
  }

  $effect(() => {
    if (!app.editing) app.grab = null
  })

  // --- Dropping a link from another page or the address bar ---------------------

  const droppedUrl = (e: DragEvent) =>
    e.dataTransfer?.getData('text/uri-list').split(/\r?\n/).find(line => line && !line.startsWith('#')) || e.dataTransfer?.getData('text/plain') || ''

  function ondragover(e: DragEvent) {
    if (dragInside || !e.dataTransfer?.types.some(t => t === 'text/uri-list' || t === 'text/plain')) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  function ondrop(e: DragEvent) {
    const url = droppedUrl(e).trim()
    if (dragInside || !isUrl(url)) return
    e.preventDefault()
    const at = { ...cellAt(e), w: 1, h: 1 }
    addTile('link', { link: newLink('', url) }, fits(at, tiles) ? at : undefined)
  }
</script>

<svelte:head>
  <svelte:element this={'style'}>{css}</svelte:element>
</svelte:head>

<svelte:window {ondragover} {ondrop} onresize={() => focused?.isConnected && (ring = measure(focused))} ondragstart={() => (dragInside = true)} ondragend={() => (dragInside = false)} />

<div class="board" bind:this={board} {onfocusin} {onfocusout}>
  {#if app.editing}
    <div
      class="grid slots"
      aria-hidden="true"
      transition:fade={{ duration: ms(200) }}
      onpointerdown={drawStart}
      onpointermove={sketch}
      onpointerup={drawEnd}
      onpointercancel={drawEnd}
    >
      {#each { length: cols * rows }, i (i)}<div class="slot" class:taken={taken.has(i)}></div>{/each}
    </div>
  {/if}

  <div class="grid" bind:this={grid}>
    {#if ghost}
      <div class="placeholder" class:invalid={!ghost.valid} bind:this={ghostEl}>
        {#if app.draft?.picking}
          <div class="picker" class:up={pickUp} class:left={pickLeft} role="menu" aria-label="New tile" tabindex="-1" onfocusout={leavePicker} transition:scale={{ start: 0.96, duration: ms(140) }}>
            {#each kindList as [kind, { name }], i (kind)}
              <button role="menuitem" bind:this={pickItems[i]} use:focusOnMount={i === 0} onclick={() => create(kind)} onkeydown={e => pickKey(e, i)}>
                {name}<kbd>{i + 1}</kbd>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    {#each tiles as tile (tile.id)}
      <div
        class="tile labels-{tile.style.labels ?? app.config.theme.labels}"
        class:lifted={lifted(tile)}
        class:resizing={app.drag?.id === tile.id && app.drag.mode === 'resize'}
        class:selected={app.selected.includes(tile.id)}
        class:invalid={app.drag?.id === tile.id && !app.drag.valid}
        data-tile={tile.id}
        data-kind={tile.kind}
        bind:this={tileEls[tile.id]}
        in:scale={{ start: 0.9, duration: ms(220), easing: t => 1 - (1 - t) ** 3 }}
      >
        {#if tile.kind === 'link'}
          <LinkItem link={tile.link} />
        {:else if tile.kind === 'group'}
          <div class="group layout-{tile.layout}" class:compact={tile.w === 1 || tile.h === 1} class:tall={tile.h > tile.w} class:one={tile.w === 1 && tile.h === 1}>
            {#if tile.showTitle}<h2>{tile.title}</h2>{/if}
            {#if tile.links.length}
              <div class="items">{#each tile.links as link (link.id)}<LinkItem {link} />{/each}</div>
            {:else}
              <p class="hint">No links yet</p>
            {/if}
          </div>
        {:else if tile.kind === 'clock'}
          <Clock {tile} />
        {:else if tile.kind === 'weather'}
          <Weather {tile} />
        {:else}
          <textarea
            class="note"
            bind:value={tile.text}
            placeholder="Notes"
            spellcheck="false"
            aria-label="Note"
            tabindex={app.editing ? -1 : undefined}
          ></textarea>
        {/if}

        {#if app.editing}
          <button
            class="handle"
            aria-label="{label(tile)}. Enter for settings, Space to move."
            bind:this={handleEls[tile.id]}
            use:navTarget={'edit'}
            onpointerdown={e => start(e, tile, 'move')}
            onpointermove={move}
            onpointerup={end}
            onpointercancel={end}
            onclick={e => select(e, tile)}
            onkeydown={e => onkey(e, tile)}
          >
            {#each edges as edge (edge)}
              <span class="resize {edge}" aria-hidden="true" onpointerdown={e => start(e, tile, 'resize', edge)}></span>
            {/each}
          </button>
          <button class="remove" tabindex="-1" aria-label="Delete {label(tile)}" onclick={() => removeTiles([tile.id])}>
            <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" /></svg>
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="ring" class:on={app.keyboard && ring} class:jump aria-hidden="true"></div>
</div>
