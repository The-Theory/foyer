<script lang="ts">
  import { findFree, kinds, newTile, type Kind } from './lib/config'
  import { themeCss } from './lib/css'
  import Grid from './lib/Grid.svelte'
  import Launcher from './lib/Launcher.svelte'
  import { app, findTile, flush, load, persist } from './lib/state.svelte'
  import ThemeEditor from './lib/ThemeEditor.svelte'
  import TileEditor from './lib/TileEditor.svelte'

  load()
  persist()

  const theme = $derived(app.config.theme)
  const css   = $derived(themeCss(theme))
  const tile  = $derived(app.sheet?.kind === 'tile' ? findTile(app.sheet.id) : undefined)

  function add(kind: Kind) {
    const [w, h] = kinds[kind].size
    const tile = newTile(kind, findFree(w, h, theme.cols, app.config.tiles))
    app.config.tiles.push(tile)
    app.sheet = { kind: 'tile', id: tile.id }
  }

  function setEditing(on: boolean) {
    app.editing = on
    if (!on) app.sheet = null
  }

  // Holding down on empty page space enters edit mode.
  let pressTimer = 0
  let pressAt    = { x: 0, y: 0 }
  function press(e: PointerEvent) {
    const target = e.target as Element
    if (app.editing || e.button !== 0 || target.closest('.tile, .launcher, .corner')) return
    pressAt    = { x: e.clientX, y: e.clientY }
    pressTimer = window.setTimeout(() => setEditing(true), 500)
  }
  const release = () => clearTimeout(pressTimer)
  const drift   = (e: PointerEvent) => Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 8 && release()

  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && app.editing) return app.sheet ? (app.sheet = null) : setEditing(false)
    if (app.editing || app.launcher || typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key.length === 1 && e.key.trim()) {
      e.preventDefault()
      app.launcher = e.key
    }
  }
</script>

<svelte:head>
  <title>{theme.pageTitle}</title>
  <svelte:element this={"style"}>{css}</svelte:element>
</svelte:head>

<svelte:window {onkeydown} onpagehide={flush} />

{#if app.ready}
  <main
    class="page labels-{theme.labels} align-{theme.align}"
    class:editing={app.editing}
    onpointerdown={press}
    onpointerup={release}
    onpointerleave={release}
    onpointermove={drift}
  >
    <Grid />

    {#if !app.config.tiles.length && !app.editing}
      <p class="empty">Your page is empty. Hold down anywhere, or use the button in the corner, to add tiles.</p>
    {/if}

    {#if app.launcher}
      <Launcher bind:query={() => app.launcher ?? '', q => (app.launcher = q || null)} />
    {/if}
  </main>

  {#if app.editing}
    <nav class="dock" aria-label="Edit page">
      <span class="dock-label">Add</span>
      {#each Object.entries(kinds) as [kind, { name }] (kind)}
        <button class="button" onclick={() => add(kind as Kind)}>{name}</button>
      {/each}
      <span class="divider"></span>
      <button class="button" aria-pressed={app.sheet?.kind === 'theme'} onclick={() => (app.sheet = app.sheet?.kind === 'theme' ? null : { kind: 'theme' })}>Look and feel</button>
      <button class="button primary" onclick={() => setEditing(false)}>Done</button>
    </nav>

    {#if app.sheet}
      <aside class="sheet" aria-label="Settings">
        {#if tile}<TileEditor {tile} />{:else if app.sheet.kind === 'theme'}<ThemeEditor />{/if}
      </aside>
    {/if}
  {:else if theme.editCorner || !app.config.tiles.length}
    <div class="corner">
      <button class="button" onclick={() => setEditing(true)}>Customize</button>
    </div>
  {/if}
{/if}
