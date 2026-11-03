<script lang="ts">
  import { defaultConfig, grids, palettes, parseConfig, type GridSize, type Look, type LookKey } from './config'
  import { app, setSquares } from './state.svelte'
  import ImageInput from './ui/ImageInput.svelte'
  import LookFields from './ui/LookFields.svelte'
  import Segmented from './ui/Segmented.svelte'
  import Swatches from './ui/Swatches.svelte'

  const t = $derived(app.config.theme)

  const get = <K extends LookKey>(key: K) => t[key]
  const set = <K extends LookKey>(key: K, value: Look[K]) => ((t as Look)[key] = value)

  // What custom CSS can target, in the order people usually need them.
  const selectors: [string, string][] = [
    ['.tile', 'Every tile'],
    ['[data-kind="link"]', 'Link tiles. Also group, clock, weather and note'],
    ['[data-tile="…"]', 'One tile. Its exact selector is at the bottom of that tile’s settings'],
    ['.icon, .label', 'Site icons and their names'],
    ['.time, .date', 'The clock’s time and date'],
    ['.temp', 'The temperature'],
    ['body', 'The page behind the tiles'],
  ]
  const variables: [string, string][] = [
    ['--cell', 'The size of one grid square, in pixels'],
    ['--text', 'The text color'],
    ['--fill', 'The tile background'],
    ['--radius', 'The corner rounding'],
  ]
  const examples: [string, string][] = [
    ['Outline every tile', '.tile {\n  outline: 1px solid #ffffff30;\n}'],
    ['Bold clock', '.time {\n  font-weight: 600;\n}'],
    ['Hide the date', '.date {\n  display: none;\n}'],
    ['Grow icons on hover', '[data-kind="link"] .item:hover .icon {\n  scale: 1.1;\n}'],
  ]
  const addExample = (css: string) => (t.css = `${t.css.trimEnd()}${t.css.trim() ? '\n\n' : ''}${css}\n`)

  let importError = $state('')

  const exportHref = $derived(`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(app.config, null, 2))}`)

  async function importFile(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    try {
      app.config  = parseConfig(await file.text())
      importError = ''
    } catch (error) {
      importError = error instanceof SyntaxError ? "That file isn't valid JSON." : (error as Error).message
    }
  }

  function reset() {
    if (confirm('Replace your tiles and look with the defaults? Export first to keep a copy.')) app.config = defaultConfig()
  }
</script>

<header>
  <h2>Page</h2>
  <p>No tiles are selected, so the look below applies to all of them. Click a tile to change just that one, or Shift-click to change several together.</p>
</header>

{#snippet gridPreview(size: GridSize)}<span class="pv-grid {size}"></span>{/snippet}

<section>
  <h3>Squares</h3>
  <p>The page is split into even squares that grow with the window. Fewer squares make every tile bigger.</p>
  <Segmented
    label="How many"
    options={(Object.keys(grids) as GridSize[]).map(size => [size, `${grids[size].cols} × ${grids[size].rows}`])}
    bind:value={() => t.squares, v => v && setSquares(v)}
    preview={gridPreview}
  />
</section>

<section>
  <h3>Behind the tiles</h3>
  <Swatches label="Color" colors={palettes.background} bind:value={t.background} />
  <ImageInput label="Image" bind:value={t.image} />
  {#if t.image}
    <Segmented label="Image size" options={[['cover', 'Fill the window'], ['contain', 'Show all of it'], ['auto', 'Actual size']]} bind:value={t.imageFit} />
    <Segmented
      label="Darken the image"
      options={[['0', 'No'], ['0.25', 'A little'], ['0.5', 'More'], ['0.75', 'A lot']]}
      bind:value={() => String(t.dim), v => v && (t.dim = Number(v))}
    />
  {/if}
</section>

<section>
  <h3>Tiles</h3>
  <LookFields {get} {set} />
</section>

<section>
  <h3>Links</h3>
  <Segmented label="Site names" options={[['hover', 'Show on hover'], ['always', 'Always show'], ['never', 'Hide']]} bind:value={t.labels} />
  <label class="check"><input type="checkbox" bind:checked={t.newTab} /> Open links in a new tab</label>
</section>

<section>
  <h3>Tab</h3>
  <label class="field"><span>Title</span><input bind:value={t.pageTitle} /></label>
  <label class="check"><input type="checkbox" bind:checked={t.editCorner} /> Show an Edit button when the pointer reaches the bottom-right corner</label>
</section>

<details class="section">
  <summary><h3>Custom CSS</h3></summary>
  <div class="stack">
  <p>For anything the options above can’t do. These rules load after Foyer’s own, so they win. Mistakes can’t break anything: delete the rule and the page goes back to how it was.</p>

  <h4>What you can target</h4>
  <dl class="reference">
    {#each selectors as [code, what] (code)}<dt><code>{code}</code></dt><dd>{what}</dd>{/each}
  </dl>

  <h4>Values you can reuse</h4>
  <dl class="reference">
    {#each variables as [code, what] (code)}<dt><code>{code}</code></dt><dd>{what}</dd>{/each}
  </dl>
  <p>For example, <code>padding: calc(var(--cell) * .1)</code> keeps spacing in proportion when the window resizes.</p>

  <h4>Start from an example</h4>
  <div class="examples">
    {#each examples as [name, css] (name)}<button type="button" class="button" onclick={() => addExample(css)}>{name}</button>{/each}
  </div>

  <textarea class="code" bind:value={t.css} spellcheck="false" aria-label="Custom CSS" placeholder="Your rules go here"></textarea>
  </div>
</details>

<section>
  <h3>Backup</h3>
  <p>Saves tiles, links, notes and the look as one file, to keep or move to another computer.</p>
  <div class="row">
    <a class="button" href={exportHref} download="foyer-layout.json">Export</a>
    <label class="button">Import<input type="file" accept="application/json,.json" class="sr-only" onchange={importFile} /></label>
    <button class="button danger" onclick={reset}>Start over</button>
  </div>
  {#if importError}<p class="error">{importError}</p>{/if}
</section>
