<script lang="ts">
  import { defaultConfig, parseConfig } from './config'
  import { app } from './state.svelte'
  import ImageInput from './ui/ImageInput.svelte'
  import Range from './ui/Range.svelte'
  import Segmented from './ui/Segmented.svelte'

  const t = $derived(app.config.theme)

  let importError = $state('')

  const exportHref = $derived(`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(app.config, null, 2))}`)

  async function importFile(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    try {
      app.config  = parseConfig(await file.text())
      importError = ''
    } catch (error) {
      importError = error instanceof SyntaxError ? 'That file is not valid JSON.' : String((error as Error).message)
    }
  }

  function reset() {
    if (confirm('Replace your whole layout and theme with the defaults? Export first if you want a copy.')) app.config = defaultConfig()
  }
</script>

<header>
  <h2>Look and feel</h2>
  <button class="button ghost" onclick={() => (app.sheet = null)}>Close</button>
</header>

<h3>Background</h3>
<label class="field color"><span>Color</span><input type="color" bind:value={t.background} /></label>
<ImageInput label="Image" bind:value={t.image} />
{#if t.image}
  <Segmented label="Fit" options={[['cover', 'Fill'], ['contain', 'Fit'], ['auto', 'Original']]} bind:value={t.imageFit} />
  <label class="field"><span>Position</span><input bind:value={t.imagePosition} placeholder="center, bottom right, 30% 70%…" /></label>
  <Range label="Darken" min={0} max={0.9} step={0.05} unit="%" bind:value={t.dim} />
{/if}

<h3>Grid</h3>
<Range label="Columns" min={2} max={20} bind:value={t.cols} />
<Range label="Cell size" min={40} max={200} unit="px" bind:value={t.cell} />
<Range label="Gap" min={0} max={48} unit="px" bind:value={t.gap} />
<Segmented label="Vertical position" options={[['center', 'Centered'], ['top', 'From top']]} bind:value={t.align} />
{#if t.align === 'top'}<Range label="Top space" min={0} max={400} unit="px" bind:value={t.offset} />{/if}

<h3>Tiles</h3>
<label class="field color"><span>Tile color</span><input type="color" bind:value={t.tile} /></label>
<Range label="Tile opacity" min={0} max={1} step={0.01} unit="%" bind:value={t.tileOpacity} />
<Range label="Background blur" min={0} max={40} unit="px" bind:value={t.blur} />
<Range label="Corner radius" min={0} max={60} unit="px" bind:value={t.radius} />
<Segmented label="Link names" options={[['hover', 'On hover'], ['always', 'Always'], ['never', 'Never']]} bind:value={t.labels} />

<h3>Text</h3>
<label class="field color"><span>Text color</span><input type="color" bind:value={t.text} /></label>
<label class="field color"><span>Accent color</span><input type="color" bind:value={t.accent} /></label>
<label class="field">
  <span>Font</span>
  <input list="fonts" bind:value={t.font} placeholder="Any font installed on this computer" />
  <datalist id="fonts">
    <option value="bricolage">Bricolage Grotesque</option>
    <option value="system">System</option>
    <option value="rounded">Rounded</option>
    <option value="serif">Serif</option>
    <option value="mono">Monospace</option>
  </datalist>
</label>

<h3>Behavior</h3>
<label class="check"><input type="checkbox" bind:checked={t.newTab} /> Open links in a new tab</label>
<label class="check"><input type="checkbox" bind:checked={t.editCorner} /> Show the customize button on corner hover</label>
<p class="hint">You can always hold down on an empty spot of the page to start editing.</p>
<label class="field"><span>Tab title</span><input bind:value={t.pageTitle} /></label>

<h3>Custom CSS</h3>
<p class="hint">Overrides everything above. Target tiles with <code>[data-kind="clock"]</code> or the selector shown on each tile.</p>
<textarea class="code" bind:value={t.css} spellcheck="false" placeholder={'.tile { border: 1px solid #fff2; }'}></textarea>

<h3>Backup</h3>
<div class="row">
  <a class="button" href={exportHref} download="foyer-layout.json">Export</a>
  <label class="button">Import<input type="file" accept="application/json,.json" hidden onchange={importFile} /></label>
  <button class="button danger" onclick={reset}>Reset</button>
</div>
{#if importError}<p class="error">{importError}</p>{/if}
