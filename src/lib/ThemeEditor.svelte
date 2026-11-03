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

  const cssDocs = 'https://github.com/The-Theory/foyer#custom-css'

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
</header>

{#snippet gridPreview(size: GridSize)}<span class="pv-grid {size}"></span>{/snippet}

<section>
  <h3>Grid</h3>
  <Segmented
    label="Squares"
    options={(Object.keys(grids) as GridSize[]).map(size => [size, `${grids[size].cols} × ${grids[size].rows}`])}
    bind:value={() => t.squares, v => v && setSquares(v)}
    preview={gridPreview}
  />
</section>

<section>
  <h3>Background</h3>
  <Swatches label="Color" colors={palettes.background} bind:value={t.background} />
  <ImageInput label="Image" bind:value={t.image} />
  {#if t.image}
    <Segmented label="Fit" options={[['cover', 'Fill'], ['contain', 'Fit'], ['auto', 'Original']]} bind:value={t.imageFit} />
    <Segmented
      label="Darken"
      options={[['0', 'None'], ['0.25', '25%'], ['0.5', '50%'], ['0.75', '75%']]}
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
  <Segmented label="Names" options={[['hover', 'On hover'], ['always', 'Always'], ['never', 'Never']]} bind:value={t.labels} />
  <label class="check"><input type="checkbox" bind:checked={t.newTab} /> Open in new tab</label>
</section>

<section>
  <h3>Tab</h3>
  <label class="field"><span>Title</span><input bind:value={t.pageTitle} /></label>
  <label class="check"><input type="checkbox" bind:checked={t.editCorner} /> Edit button in corner</label>
</section>

<section>
  <h3>Custom CSS</h3>
  <textarea class="code" bind:value={t.css} spellcheck="false" aria-label="Custom CSS"></textarea>
  <a class="doc-link" href={cssDocs} target="_blank" rel="noreferrer">Selectors and examples</a>
</section>

<section>
  <h3>Backup</h3>
  <div class="row">
    <a class="button" href={exportHref} download="foyer-layout.json">Export</a>
    <label class="button">Import<input type="file" accept="application/json,.json" class="sr-only" onchange={importFile} /></label>
    <button class="button danger" onclick={reset}>Reset</button>
  </div>
  {#if importError}<p class="error">{importError}</p>{/if}
</section>
