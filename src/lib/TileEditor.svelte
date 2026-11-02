<script lang="ts">
  import { focusOnMount } from './nav'
  import { kinds, linkName, newLink, type Link, type Tile, type WeatherTile } from './config'
  import { closeSheet, removeTile } from './state.svelte'
  import Icon from './ui/Icon.svelte'
  import LinkFields from './ui/LinkFields.svelte'
  import Segmented from './ui/Segmented.svelte'

  let { tile }: { tile: Tile } = $props()

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
  <h2>{kinds[tile.kind].name}</h2>
  <button class="button ghost" onclick={closeSheet}>Close <kbd>Esc</kbd></button>
</header>

{#if tile.kind === 'link'}
  <LinkFields link={tile.link} autofocus />

{:else if tile.kind === 'group'}
  <label class="field"><span>Name</span><input bind:value={tile.title} use:focusOnMount /></label>
  <label class="check"><input type="checkbox" bind:checked={tile.showTitle} /> Show name</label>
  <Segmented label="Layout" options={[['grid', 'Icons'], ['list', 'List']]} bind:value={tile.layout} />

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

{:else if tile.kind === 'clock'}
  <label class="check"><input type="checkbox" bind:checked={tile.hour12} use:focusOnMount /> 12-hour time</label>
  <label class="check"><input type="checkbox" bind:checked={tile.seconds} /> Seconds</label>
  <label class="check"><input type="checkbox" bind:checked={tile.date} /> Date</label>

{:else if tile.kind === 'weather'}
  <form class="field" onsubmit={e => { e.preventDefault(); search() }}>
    <span>City</span>
    <div class="row">
      <input bind:value={query} placeholder={tile.place || 'Search for a city'} use:focusOnMount />
      <button class="button" disabled={!query.trim()}>Search</button>
    </div>
  </form>
  {#if failed}<p class="error">City search didn't respond. Check your connection and try again.</p>{/if}
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

{:else}
  <p class="hint">Write in the note itself. It saves as you type.</p>
{/if}

<h3>Tile</h3>
<label class="check"><input type="checkbox" bind:checked={tile.frame} /> Background</label>
<p class="hint">CSS selector <code>[data-tile="{tile.id}"]</code></p>
<button class="button danger" onclick={() => removeTile(tile.id)}>Delete tile <kbd>Del</kbd></button>
