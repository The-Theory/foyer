<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { isUrl, newLink } from './lib/config'
  import { themeCss } from './lib/css'
  import Grid from './lib/Grid.svelte'
  import { arrows, focusOnMount, step } from './lib/nav'
  import Palette from './lib/Palette.svelte'
  import { addTile, app, centerLayout, deselect, findTile, flush, keys, load, ms, openPage, persist, redo, setEditing, startDraft, undo } from './lib/state.svelte'
  import ThemeEditor from './lib/ThemeEditor.svelte'
  import TileEditor from './lib/TileEditor.svelte'

  load()
  persist()

  const theme = $derived(app.config.theme)
  const css   = $derived(themeCss(app.config))
  const selected = $derived(app.selected.map(findTile).filter(t => t !== undefined))
  const slide = { x: 24, duration: ms(220), easing: (t: number) => 1 - (1 - t) ** 3 }
  const rise  = { y: 12, duration: ms(200), easing: (t: number) => 1 - (1 - t) ** 3 }

  const shortcuts: [string, [string, string][]][] = [
    ['Anywhere', [
      ['Start typing', 'Search links, commands and the web'],
      ['Arrow keys', 'Move between links'],
      [`${keys.mod} Enter`, 'Open in a new tab'],
      [`${keys.mod} V`, 'Add a copied address as a link'],
      [`Esc or ${keys.mod} E`, 'Edit layout'],
      ['?', 'Show this list'],
    ]],
    ['While editing', [
      ['Click or drag', 'Add a tile on empty squares'],
      ['Click a tile', 'Select it; Shift-click selects several'],
      ['Arrow keys', 'Move between tiles'],
      ['Space', 'Pick up or drop the focused tile'],
      [`Arrows, ${keys.shift} arrows`, 'Move or resize a picked-up tile'],
      ['Enter', 'Select the tile and jump to its settings'],
      [`${keys.shift} Enter`, 'Add it to the selection'],
      ['Delete', 'Delete the focused or selected tiles'],
      ['A', 'Add a tile in the next free square'],
      [',', 'Page settings'],
      [`${keys.mod} Z, ${keys.shift} ${keys.mod} Z`, 'Undo, redo'],
      ['Esc', 'Clear the selection, then stop editing'],
    ]],
  ]

  // Holding down on empty page space enters edit mode.
  let pressTimer = 0
  let pressAt    = { x: 0, y: 0 }
  function press(e: PointerEvent) {
    const target = e.target as Element
    if (app.editing || e.button !== 0 || target.closest('.tile, .palette, .corner')) return
    pressAt    = { x: e.clientX, y: e.clientY }
    pressTimer = window.setTimeout(() => setEditing(true), 500)
  }
  const release = () => clearTimeout(pressTimer)
  const drift   = (e: PointerEvent) => Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > 8 && release()

  const typing = (target: EventTarget | null) =>
    target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Tab' || arrows[e.key]) app.keyboard = true
    if (e.defaultPrevented || app.palette !== null) return

    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'z' && !typing(e.target)) return e.preventDefault(), e.shiftKey ? redo() : undo()
    if (mod && e.code === 'KeyE') return e.preventDefault(), setEditing(!app.editing)

    if (e.key === 'Escape') {
      const inSheet = (e.target as Element).closest('.sheet')
      if (typing(e.target) && !inSheet) return (e.target as HTMLElement).blur()
      if (app.menu) app.menu = null
      else if (app.draft) app.draft = null
      else if (app.selected.length) deselect()
      else setEditing(!app.editing)
      return
    }
    if (typing(e.target) || app.menu || app.draft || mod || e.altKey) return

    const dir = arrows[e.key]
    if (dir) {
      e.preventDefault()
      step(app.editing ? 'edit' : 'view', dir, document.activeElement)?.focus()
      return
    }

    const key = e.key.toLowerCase()
    if (key === '?') app.menu = 'help'
    else if (app.editing && key === 'a') startDraft()
    else if (app.editing && key === ',') openPage()
    else if (!app.editing && e.key.length === 1 && e.key.trim()) app.palette = e.key
    else return
    e.preventDefault()
  }

  function onpaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text').trim() ?? ''
    if (typing(e.target) || !isUrl(text)) return
    e.preventDefault()
    addTile('link', { link: newLink('', text) })
  }

</script>

<svelte:head>
  <title>{theme.pageTitle}</title>
  <svelte:element this={'style'}>{css}</svelte:element>
</svelte:head>

<svelte:window {onkeydown} {onpaste} onpagehide={flush} onpointerdowncapture={() => (app.keyboard = false)} />

{#if app.ready}
  <main
    class="page labels-{theme.labels}"
    class:editing={app.editing}
    onpointerdown={press}
    onpointerup={release}
    onpointerleave={release}
    onpointermove={drift}
  >
    <Grid />

    {#if !app.config.tiles.length && !app.editing}
      <p class="empty">Press <kbd>Esc</kbd> to add tiles</p>
    {/if}

    {#if app.palette}
      <Palette bind:query={() => app.palette ?? '', q => (app.palette = q || null)} />
    {/if}
  </main>

  {#if app.editing}
    <nav class="toolbar" aria-label="Editing" transition:fly={rise}>
      <button class="button" onclick={centerLayout}>Center</button>
      <button class="button" onclick={undo}>Undo <kbd>{keys.mod} Z</kbd></button>
      <span class="divider"></span>
      <button class="button primary" onclick={() => setEditing(false)}>Done <kbd>Esc</kbd></button>
    </nav>

    <aside class="sheet" aria-label="Settings" transition:fly={slide}>
      {#key app.selected.join()}
        {#if selected.length}<TileEditor tiles={selected} />{:else}<ThemeEditor />{/if}
      {/key}
    </aside>
  {:else if theme.editCorner || !app.config.tiles.length}
    <div class="corner">
      <button class="button" onclick={() => setEditing(true)}>Edit <kbd>{keys.mod} E</kbd></button>
    </div>
  {/if}

  {#if app.menu === 'help'}
    <div class="scrim" role="presentation" onclick={() => (app.menu = null)} transition:fade={{ duration: ms(160) }}>
      <div class="help" role="dialog" aria-label="Keyboard shortcuts" tabindex="-1" use:focusOnMount onclick={e => e.stopPropagation()} onkeydown={e => e.key === '?' && (app.menu = null)}>
        {#each shortcuts as [title, rows] (title)}
          <h2>{title}</h2>
          <dl>
            {#each rows as [key, what] (key + what)}<dt><kbd>{key}</kbd></dt><dd>{what}</dd>{/each}
          </dl>
        {/each}
      </div>
    </div>
  {/if}

  <p class="sr-only" aria-live="polite">{app.announce}</p>
{/if}
