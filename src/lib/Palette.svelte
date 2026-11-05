<script lang="ts">
  import { scale } from 'svelte/transition'
  import { allLinks, hostOf, kinds, linkName, safeUrl, type Kind, type Link } from './config'
  import { addTile, app, keys, ms, openPage, setEditing } from './state.svelte'
  import { focusOnMount } from './nav'
  import { webext } from './webext'
  import Icon from './ui/Icon.svelte'

  let { query = $bindable() }: { query: string } = $props()

  type Result =
    | { type: 'link'; id: string; name: string; link: Link }
    | { type: 'command'; id: string; name: string; hint?: string; run: () => void }

  const links = $derived(allLinks(app.config.tiles))

  const commands: Result[] = [
    { type: 'command', id: 'edit', name: 'Edit layout', hint: `${keys.mod} E`, run: () => setEditing(true) },
    { type: 'command', id: 'appearance', name: 'Change the look', run: openPage },
    ...Object.entries(kinds).map(([kind, { name }]): Result => ({
      type: 'command', id: `add-${kind}`, name: `Add ${name.toLowerCase()} tile`, run: () => addTile(kind as Kind),
    })),
    { type: 'command', id: 'help', name: 'Keyboard shortcuts', hint: '?', run: () => (app.menu = 'help') },
  ]

  // Lower is better: name starts with the query, then a word in it does, then anywhere.
  function rank(name: string, q: string, url = '') {
    const n = name.toLowerCase()
    if (n.startsWith(q)) return 0
    if (n.split(/\s+/).some(w => w.startsWith(q))) return 1
    if (n.includes(q)) return 2
    return url.toLowerCase().includes(q) ? 3 : -1
  }

  const results = $derived.by(() => {
    const q = query.trim().toLowerCase()
    const pool: Result[] = [...links.map((link): Result => ({ type: 'link', id: link.id, name: linkName(link), link })), ...commands]
    return pool
      .map(r => ({ r, score: rank(r.name, q, r.type === 'link' ? r.link.url : '') + (r.type === 'command' ? 0.5 : 0) }))
      .filter(m => m.score >= 0)
      .sort((a, b) => a.score - b.score)
      .slice(0, 7)
      .map(m => m.r)
  })

  let active = $state(0)
  $effect(() => {
    query
    active = 0
  })

  const close = () => (query = '')

  function go(url: string, newTab: boolean) {
    if (newTab) window.open(url, '_blank', 'noreferrer')
    else location.href = url
  }

  function run(i: number, newTab = app.config.theme.newTab) {
    const r = results[i]
    if (r?.type === 'link') return go(safeUrl(r.link.url), newTab)
    close()
    if (r) return r.run()
    if (webext?.search?.query) webext.search.query({ text: query, disposition: newTab ? 'NEW_TAB' : 'CURRENT_TAB' })
    else go(`https://www.google.com/search?q=${encodeURIComponent(query)}`, newTab)
  }

  function onkeydown(e: KeyboardEvent) {
    const total = results.length + 1
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) active = (active + 1) % total
    else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) active = (active - 1 + total) % total
    else if (e.key === 'Enter') run(active, e.metaKey || e.ctrlKey || app.config.theme.newTab)
    else if (e.key === 'Escape') close()
    else return
    e.preventDefault()
    e.stopPropagation()
  }

</script>

<div class="palette" role="dialog" aria-label="Search" transition:scale={{ start: 0.97, duration: ms(160), easing: t => 1 - (1 - t) ** 3 }}>
  <input
    use:focusOnMount
    bind:value={query}
    {onkeydown}
    onblur={close}
    aria-label="Search links, commands and the web"
    role="combobox"
    aria-expanded="true"
    aria-controls="palette-results"
    aria-activedescendant="palette-{active}"
    spellcheck="false"
    autocomplete="off"
  />
  <ul id="palette-results" role="listbox">
    {#each results as r, i (r.id)}
      <li id="palette-{i}" role="option" aria-selected={active === i}>
        <button tabindex="-1" onpointerdown={e => e.preventDefault()} onpointerenter={() => (active = i)} onclick={() => run(i)}>
          {#if r.type === 'link'}
            <Icon link={r.link} />
            <span class="name">{r.name}</span>
            <small>{hostOf(r.link.url)}</small>
          {:else}
            <span class="icon glyph command" aria-hidden="true"></span>
            <span class="name">{r.name}</span>
            {#if r.hint}<kbd>{r.hint}</kbd>{/if}
          {/if}
        </button>
      </li>
    {/each}
    <li id="palette-{results.length}" role="option" aria-selected={active === results.length}>
      <button tabindex="-1" onpointerdown={e => e.preventDefault()} onpointerenter={() => (active = results.length)} onclick={() => run(results.length)}>
        <span class="icon glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
        </span>
        <span class="name">Search the web for “{query.trim()}”</span>
      </button>
    </li>
  </ul>
</div>
