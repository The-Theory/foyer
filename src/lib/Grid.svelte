<script lang="ts">
  import { tick, untrack } from 'svelte'
  import { fade, scale } from 'svelte/transition'
  import { fits, isUrl, kinds, linkName, newLink, type Box, type Tile } from './config'
  import { layoutCss, type Ring } from './css'
  import { arrows, firstIn, isNavTarget, navTarget } from './nav'
  import { addTile, app, ease, handleEls, keys, ms, removeTile, tileEls } from './state.svelte'
  import Clock from './tiles/Clock.svelte'
  import Weather from './tiles/Weather.svelte'
  import LinkItem from './ui/LinkItem.svelte'

  type Mode = 'move' | 'resize'

  let board: HTMLDivElement
  let grid: HTMLDivElement
  let action: { tile: Tile; mode: Mode; x0: number; y0: number; moved: boolean } | null = null
  let swallowClick = false
  let dragInside   = false

  const tiles = $derived(app.config.tiles)
  const cols  = $derived(app.config.theme.cols)
  const rows  = $derived(Math.max(1, ...tiles.map(t => t.y + t.h)))

  // Spare rows below the layout to drag into; they overflow the board so the page doesn't shift.
  const slotRows = $derived(Math.max(rows, (app.drag?.y ?? 0) + (app.drag?.h ?? 0)) + 3)

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

  const css = $derived(layoutCss(tiles, app.drag, rows, app.keyboard ? ring : null))

  // --- Glide on layout changes (FLIP) ------------------------------------------

  const layoutKey = $derived(
    tiles.map(t => {
      const b = app.drag?.id === t.id && app.drag.mode === 'resize' ? app.drag : t
      return `${t.id}:${b.x},${b.y},${b.w},${b.h}`
    }).join('|') + `|${app.drag?.mode === 'move' ? app.drag.id : ''}|${app.config.theme.cell},${app.config.theme.gap},${cols}`,
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
      if (!a || !el?.isConnected || (app.drag?.id === id && app.drag.mode === 'move')) continue
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

  const pitch = () => (grid.getBoundingClientRect().width + app.config.theme.gap) / cols

  function cellAt(e: MouseEvent) {
    const rect = grid.getBoundingClientRect()
    return { col: Math.floor((e.clientX - rect.left) / pitch()), row: Math.floor((e.clientY - rect.top) / pitch()) }
  }

  function boxFor(tile: Tile, mode: Mode, dx: number, dy: number): Box {
    return mode === 'move'
      ? { x: clamp(tile.x + dx, 0, cols - tile.w), y: Math.max(0, tile.y + dy), w: tile.w, h: tile.h }
      : { x: tile.x, y: tile.y, w: clamp(tile.w + dx, 1, cols - tile.x), h: Math.max(1, tile.h + dy) }
  }

  function place(tile: Tile, box: Box) {
    if (!fits(box, tiles, tile.id)) return false
    Object.assign(tile, box)
    return true
  }

  function start(e: PointerEvent, tile: Tile, mode: Mode) {
    if (e.button !== 0) return
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    action = { tile, mode, x0: e.clientX, y0: e.clientY, moved: false }
  }

  function move(e: PointerEvent) {
    if (!action) return
    const { tile, mode, x0, y0 } = action
    const px = e.clientX - x0
    const py = e.clientY - y0
    if (!action.moved && Math.hypot(px, py) < 4) return
    action.moved = true
    const size = pitch()
    const box  = boxFor(tile, mode, Math.round(px / size), Math.round(py / size))
    app.drag = { id: tile.id, ...box, mode, valid: fits(box, tiles, tile.id), px: mode === 'move' ? px : 0, py: mode === 'move' ? py : 0 }
  }

  function end() {
    if (!action) return
    if (app.drag?.valid) place(action.tile, app.drag)
    swallowClick = action.moved
    action   = null
    app.drag = null
  }

  function select(e: MouseEvent, tile: Tile) {
    if (swallowClick) return void (swallowClick = false)
    if (e.detail === 0) return // keyboard activation is handled in onkey
    app.sheet = { kind: 'tile', id: tile.id }
  }

  // --- Keyboard: Space picks up, arrows move, shift+arrows resize ---------------

  function onkey(e: KeyboardEvent, tile: Tile) {
    const grabbed = app.grab?.id === tile.id
    const dir     = arrows[e.key]

    if (e.key === ' ' || (e.key === 'Enter' && grabbed)) {
      app.grab     = grabbed ? null : { id: tile.id, origin: { x: tile.x, y: tile.y, w: tile.w, h: tile.h } }
      app.announce = grabbed ? `Dropped ${label(tile)}.` : `Picked up ${label(tile)}. Arrow keys move it, ${keys.shift} and arrow keys resize it, Space drops it.`
    } else if (e.key === 'Enter') {
      app.sheet = { kind: 'tile', id: tile.id }
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
      removeTile(tile.id)
      app.announce = `Deleted ${label(tile)}. ${keys.mod} Z brings it back.`
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
    const { col, row } = cellAt(e)
    const at = { x: clamp(col, 0, cols - 1), y: Math.max(0, row), w: 1, h: 1 }
    addTile('link', { link: newLink('', url) }, fits(at, tiles) ? at : undefined)
  }
</script>

<svelte:head>
  <svelte:element this={'style'}>{css}</svelte:element>
</svelte:head>

<svelte:window {ondragover} {ondrop} ondragstart={() => (dragInside = true)} ondragend={() => (dragInside = false)} />

<div class="board" bind:this={board} {onfocusin} {onfocusout}>
  {#if app.editing}
    <div class="grid slots" aria-hidden="true" transition:fade={{ duration: ms(200) }}>
      {#each { length: cols * slotRows }, i (i)}<div class="slot"></div>{/each}
    </div>
  {/if}

  <div class="grid" bind:this={grid}>
    {#if app.drag?.mode === 'move'}
      <div class="placeholder" class:invalid={!app.drag.valid}></div>
    {/if}

    {#each tiles as tile (tile.id)}
      <div
        class="tile"
        class:frame={tile.frame}
        class:lifted={lifted(tile)}
        class:selected={app.sheet?.kind === 'tile' && app.sheet.id === tile.id}
        class:invalid={app.drag?.id === tile.id && !app.drag.valid}
        data-tile={tile.id}
        data-kind={tile.kind}
        bind:this={tileEls[tile.id]}
        in:scale={{ start: 0.9, duration: ms(220), easing: t => 1 - (1 - t) ** 3 }}
      >
        {#if tile.kind === 'link'}
          <LinkItem link={tile.link} />
        {:else if tile.kind === 'group'}
          <div class="group layout-{tile.layout}">
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
            <span class="resize" aria-hidden="true" onpointerdown={e => start(e, tile, 'resize')}></span>
          </button>
        {/if}
      </div>
    {/each}
  </div>

  <div class="ring" class:on={app.keyboard && ring} class:jump aria-hidden="true"></div>
</div>
