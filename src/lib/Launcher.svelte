<script lang="ts">
  import { hostOf, linkName, safeUrl, type Link } from './config'
  import { app } from './state.svelte'
  import Icon from './ui/Icon.svelte'

  let { query = $bindable() }: { query: string } = $props()

  let active = $state(0)

  const links = $derived(app.config.tiles.flatMap(t => (t.kind === 'link' ? [t.link] : t.kind === 'group' ? t.links : [])))

  // Lower is better: name starts with the query, then a word in the name does, then anywhere.
  function score(link: Link, q: string) {
    const name = linkName(link).toLowerCase()
    if (name.startsWith(q)) return 0
    if (name.split(/\s+/).some(w => w.startsWith(q))) return 1
    if (name.includes(q)) return 2
    return link.url.toLowerCase().includes(q) ? 3 : -1
  }

  const matches = $derived.by(() => {
    const q = query.trim().toLowerCase()
    return links
      .map(link => ({ link, rank: score(link, q) }))
      .filter(m => m.rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 6)
      .map(m => m.link)
  })

  $effect(() => {
    query
    active = 0
  })

  function go(url: string, newTab: boolean) {
    if (newTab) window.open(url, '_blank', 'noreferrer')
    else location.href = url
  }

  function searchWeb(newTab: boolean) {
    if (typeof browser !== 'undefined' && browser.search?.query) {
      browser.search.query({ text: query, disposition: newTab ? 'NEW_TAB' : 'CURRENT_TAB' })
    } else {
      go(`https://www.google.com/search?q=${encodeURIComponent(query)}`, newTab)
    }
  }

  function open(i: number, newTab = app.config.theme.newTab) {
    const link = matches[i]
    if (link) go(safeUrl(link.url), newTab)
    else searchWeb(newTab)
  }

  function onkeydown(e: KeyboardEvent) {
    const total = matches.length + 1
    if (e.key === 'ArrowDown') active = (active + 1) % total
    else if (e.key === 'ArrowUp') active = (active - 1 + total) % total
    else if (e.key === 'Enter') open(active, e.metaKey || e.ctrlKey || app.config.theme.newTab)
    else if (e.key === 'Escape') query = ''
    else return
    e.preventDefault()
  }

  const focus = (el: HTMLInputElement) => el.focus()
</script>

<div class="launcher" role="dialog" aria-label="Open a link">
  <input
    use:focus
    bind:value={query}
    {onkeydown}
    onblur={() => (query = '')}
    aria-label="Search your links"
    role="combobox"
    aria-expanded="true"
    aria-controls="launcher-results"
    aria-activedescendant="launcher-{active}"
    spellcheck="false"
    autocomplete="off"
  />
  <ul id="launcher-results" role="listbox">
    {#each matches as link, i (link.id)}
      <li id="launcher-{i}" role="option" aria-selected={active === i}>
        <button tabindex="-1" onpointerdown={e => e.preventDefault()} onclick={() => open(i)}>
          <Icon {link} />
          <span>{linkName(link)}</span>
          <small>{hostOf(link.url)}</small>
        </button>
      </li>
    {/each}
    <li id="launcher-{matches.length}" role="option" aria-selected={active === matches.length}>
      <button tabindex="-1" onpointerdown={e => e.preventDefault()} onclick={() => open(matches.length)}>
        <span class="icon glyph" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
        </span>
        <span>Search the web for “{query.trim()}”</span>
      </button>
    </li>
  </ul>
</div>
