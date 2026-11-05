<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { focusOnMount } from './nav'
  import { kinds, linkName, newLink, type Link, type Look, type LookKey, type Tile, type WeatherTile } from './config'
  import { app, deselect, removeTiles } from './state.svelte'
  import Icon from './ui/Icon.svelte'
  import ImageInput from './ui/ImageInput.svelte'
  import LinkFields from './ui/LinkFields.svelte'
  import Segmented from './ui/Segmented.svelte'
  import LookFields from './ui/LookFields.svelte'

  // Edits the selected tiles: a single tile gets its own settings too; several share the look.
  let { tiles }: { tiles: Tile[] } = $props()

  const tile  = $derived(tiles.length === 1 ? tiles[0] : undefined)
  const label = $derived(tile ? (tile.kind === 'link' ? linkName(tile.link) || 'Link' : tile.kind === 'group' ? tile.title || 'Group' : kinds[tile.kind].name) : `${tiles.length} tiles`)

  // Keyboard users who pressed Enter (or just added the tile) land in the first field; clicks don't steal focus.
  const focus = untrack(() => app.focusPanel)
  onMount(() => (app.focusPanel = false))

  // A key the tile hasn't changed follows the page. With several tiles, a value they don't share shows as unset.
  const get = <K extends LookKey>(key: K) => {
    const values = new Set(tiles.map(t => t.style[key] ?? app.config.theme[key]))
    return values.size === 1 ? [...values][0] : undefined
  }
  const set = <K extends LookKey>(key: K, value: Look[K]) => tiles.forEach(t => (t.style[key] = value))
  const changed = $derived(tiles.some(t => Object.keys(t.style).length))

  interface Place { name: string; admin1?: string; country?: string; latitude: number; longitude: number }

  let query  = $state('')
  let places = $state<Place[] | null>(null)
  let failed = $state(false)
  let opened = $state('')

  const placeName = (p: Place) => [p.name, p.admin1, p.country].filter(Boolean).join(', ')

  async function search() {
    try {
      const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=5&name=${encodeURIComponent(query)}`)
      const data = (await res.json()) as { results?: Place[] }
      places = data.results ?? []
      failed = false
    } catch (error) {
      console.warn('Foyer: city search failed', error)
      failed = true
    }
  }

  function choose(weather: WeatherTile, p: Place) {
    Object.assign(weather, { place: p.name, lat: p.latitude, lon: p.longitude })
    places = null
    query  = ''
  }

  function shift(links: Link[], i: number, by: number) {
    const j = i + by
    if (j < 0 || j >= links.length) return
    ;[links[i], links[j]] = [links[j], links[i]]
  }

  function addLink(links: Link[]) {
    const link = newLink()
    links.push(link)
    opened = link.id
  }
</script>

<header>
  <div class="title">
    <h2>{label}</h2>
    <button class="button ghost" onclick={deselect}>Page <kbd>Esc</kbd></button>
  </div>
</header>

{#if !tile}
  <!-- several tiles: only the shared look -->
{:else if tile.kind === 'link'}
  <section><LinkFields link={tile.link} autofocus={focus} /></section>

{:else if tile.kind === 'group'}
  <section>
  <label class="field"><span>Name</span><input bind:value={tile.title} use:focusOnMount={focus} /></label>
  <label class="check"><input type="checkbox" bind:checked={tile.showTitle} /> Show name</label>
  <Segmented label="Layout" options={[['grid', 'Icons'], ['list', 'List']]} bind:value={tile.layout} />
  </section>

  <section>
  <h3>Links</h3>
  {#if tile.links.length}
    <ul class="links">
      {#each tile.links as link, i (link.id)}
        <li class:open={opened === link.id}>
          <div class="row">
            <button class="summary" onclick={() => (opened = opened === link.id ? '' : link.id)} aria-expanded={opened === link.id}>
              <Icon {link} /><span>{linkName(link) || 'New link'}</span>
            </button>
            <button class="button ghost icon-only" aria-label="Move up" disabled={i === 0} onclick={() => shift(tile.links, i, -1)}>↑</button>
            <button class="button ghost icon-only" aria-label="Move down" disabled={i === tile.links.length - 1} onclick={() => shift(tile.links, i, 1)}>↓</button>
            <button class="button ghost icon-only" aria-label="Remove {linkName(link)}" onclick={() => tile.links.splice(i, 1)}>✕</button>
          </div>
          {#if opened === link.id}<div class="nested"><LinkFields {link} autofocus /></div>{/if}
        </li>
      {/each}
    </ul>
  {/if}
  <button class="button" onclick={() => addLink(tile.links)}>Add link</button>
  </section>

{:else if tile.kind === 'clock'}
  <section>
  <label class="check"><input type="checkbox" bind:checked={tile.hour12} use:focusOnMount={focus} /> 12-hour time</label>
  <label class="check"><input type="checkbox" bind:checked={tile.seconds} /> Seconds</label>
  <label class="check"><input type="checkbox" bind:checked={tile.date} /> Date</label>
  </section>

{:else if tile.kind === 'weather'}
  <section>
  <form class="field" onsubmit={e => { e.preventDefault(); search() }}>
    <span>City</span>
    <div class="row">
      <input bind:value={query} placeholder={tile.place || 'Search for a city'} use:focusOnMount={focus} />
      <button class="button" disabled={!query.trim()}>Search</button>
    </div>
  </form>
  {#if failed}<p class="error">Search failed. Check your connection.</p>{/if}
  {#if places}
    <ul class="places">
      {#each places as p (`${p.latitude},${p.longitude}`)}
        <li><button onclick={() => choose(tile, p)}>{placeName(p)}</button></li>
      {:else}
        <li class="hint">No city called “{query}”.</li>
      {/each}
    </ul>
  {/if}
  <Segmented
    label="Units"
    options={[['c', '°C'], ['f', '°F']]}
    bind:value={() => (tile.fahrenheit ? 'f' : 'c'), unit => (tile.fahrenheit = unit === 'f')}
  />
  </section>
{:else if tile.kind === 'web'}
  <section>
  <label class="field"><span>Address</span><input bind:value={tile.url} placeholder="example.com" spellcheck="false" use:focusOnMount={focus} /></label>
  <p>Some sites don't allow being shown inside a tile and stay blank.</p>
  <Segmented label="Zoom" options={[['100', '100%'], ['75', '75%'], ['50', '50%']]} bind:value={tile.zoom} />
  <label class="field"><span>When offline, show</span><input bind:value={tile.offline} placeholder="Offline" /></label>
  </section>

{:else if tile.kind === 'image'}
  <section>
  <ImageInput label="Image" bind:value={tile.src} />
  <Segmented label="Fit" options={[['cover', 'Fill'], ['contain', 'Fit']]} bind:value={tile.fit} />
  </section>
{/if}

<LookFields {get} {set} text={tiles.some(t => t.kind !== 'image')} icons={tiles.some(t => t.kind === 'link' || t.kind === 'group')} />

{#if changed}
  <section>
    <button class="button" onclick={() => tiles.forEach(t => (t.style = {}))}>Reset to page look</button>
  </section>
{/if}

<section>
  {#if tile}<p>CSS <code>[data-tile="{tile.id}"]</code></p>{/if}
  <button class="button danger" onclick={() => removeTiles(tiles.map(t => t.id))}>{tile ? 'Delete tile' : `Delete ${tiles.length} tiles`} <kbd>Del</kbd></button>
</section>
