<script lang="ts">
  import { kinds, linkName, newLink, type Link, type Tile, type WeatherTile } from './config'
  import { app } from './state.svelte'
  import Icon from './ui/Icon.svelte'
  import LinkFields from './ui/LinkFields.svelte'
  import Segmented from './ui/Segmented.svelte'

  let { tile }: { tile: Tile } = $props()

  interface Place { name: string; admin1?: string; country?: string; latitude: number; longitude: number }

  let query   = $state('')
  let places  = $state<Place[] | null>(null)
  let opened  = $state('')

  const placeName = (p: Place) => [p.name, p.admin1, p.country].filter(Boolean).join(', ')

  async function search() {
    const res  = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=5&name=${encodeURIComponent(query)}`)
    const data = (await res.json()) as { results?: Place[] }
    places = data.results ?? []
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

  function remove() {
    app.config.tiles = app.config.tiles.filter(t => t.id !== tile.id)
    app.sheet = null
  }
</script>

<header>
  <h2>{kinds[tile.kind].name}</h2>
  <button class="button ghost" onclick={() => (app.sheet = null)}>Close</button>
</header>

{#if tile.kind === 'link'}
  <LinkFields link={tile.link} />

{:else if tile.kind === 'group'}
  <label class="field"><span>Name</span><input bind:value={tile.title} /></label>
  <label class="check"><input type="checkbox" bind:checked={tile.showTitle} /> Show name</label>
  <Segmented label="Show links as" options={[['grid', 'Icons'], ['list', 'List']]} bind:value={tile.layout} />

  <h3>Links</h3>
  <ul class="links">
    {#each tile.links as link, i (link.id)}
      <li class:open={opened === link.id}>
        <div class="row">
          <button class="summary" onclick={() => (opened = opened === link.id ? '' : link.id)} aria-expanded={opened === link.id}>
            <Icon {link} /><span>{linkName(link) || 'New link'}</span>
          </button>
          <button class="button ghost" aria-label="Move up" onclick={() => shift(tile.links, i, -1)}>↑</button>
          <button class="button ghost" aria-label="Move down" onclick={() => shift(tile.links, i, 1)}>↓</button>
          <button class="button ghost" aria-label="Remove" onclick={() => tile.links.splice(i, 1)}>✕</button>
        </div>
        {#if opened === link.id}<div class="nested"><LinkFields {link} /></div>{/if}
      </li>
    {/each}
  </ul>
  <button class="button" onclick={() => addLink(tile.links)}>Add link</button>

{:else if tile.kind === 'clock'}
  <label class="check"><input type="checkbox" bind:checked={tile.hour12} /> 12-hour time</label>
  <label class="check"><input type="checkbox" bind:checked={tile.seconds} /> Show seconds</label>
  <label class="check"><input type="checkbox" bind:checked={tile.date} /> Show date</label>

{:else if tile.kind === 'weather'}
  <form class="field" onsubmit={e => { e.preventDefault(); search() }}>
    <span>Place</span>
    <div class="row">
      <input bind:value={query} placeholder="Search for a city" />
      <button class="button" disabled={!query.trim()}>Find</button>
    </div>
    {#if tile.place}<small>Showing weather for {tile.place}.</small>{/if}
  </form>
  {#if places}
    <ul class="places">
      {#each places as p (`${p.latitude},${p.longitude}`)}
        <li><button onclick={() => choose(tile, p)}>{placeName(p)}</button></li>
      {:else}
        <li class="hint">No places match “{query}”.</li>
      {/each}
    </ul>
  {/if}
  <Segmented
    label="Units"
    options={[['c', 'Celsius'], ['f', 'Fahrenheit']]}
    bind:value={() => (tile.fahrenheit ? 'f' : 'c'), unit => (tile.fahrenheit = unit === 'f')}
  />

{:else}
  <p class="hint">Type straight into the note. It saves as you go.</p>
{/if}

<h3>Tile</h3>
<label class="check"><input type="checkbox" bind:checked={tile.frame} /> Show tile background</label>
<p class="hint">Style this tile in custom CSS with <code>[data-tile="{tile.id}"]</code>.</p>
<button class="button danger" onclick={remove}>Delete tile</button>
