<script lang="ts">
  import { focusOnMount } from './nav'
  import { defaultConfig, parseConfig } from './config'
  import { app, closeSheet } from './state.svelte'
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
      importError = error instanceof SyntaxError ? "That file isn't valid JSON." : (error as Error).message
    }
  }

  function reset() {
    if (confirm('Replace your tiles and appearance with the defaults? Export first to keep a copy.')) app.config = defaultConfig()
  }
</script>

<header>
  <h2>Appearance</h2>
  <button class="button ghost" onclick={closeSheet}>Close <kbd>Esc</kbd></button>
</header>

<h3>Background</h3>
<label class="field color"><span>Color</span><input type="color" bind:value={t.background} use:focusOnMount /></label>
<ImageInput label="Image" bind:value={t.image} />
{#if t.image}
  <Segmented label="Fit" options={[['cover', 'Fill'], ['contain', 'Fit'], ['auto', 'Actual size']]} bind:value={t.imageFit} />
  <label class="field"><span>Position</span><input bind:value={t.imagePosition} placeholder="center, bottom right, 30% 70%" /></label>
  <Range label="Darken" min={0} max={0.9} step={0.05} unit="%" bind:value={t.dim} />
{/if}

<h3>Layout</h3>
<Range label="Columns" min={2} max={20} bind:value={t.cols} />
<Range label="Cell size" min={40} max={200} unit="px" bind:value={t.cell} />
<Range label="Spacing" min={0} max={48} unit="px" bind:value={t.gap} />
<Segmented label="Position" options={[['center', 'Centered'], ['top', 'Top']]} bind:value={t.align} />
{#if t.align === 'top'}<Range label="Space above" min={0} max={400} unit="px" bind:value={t.offset} />{/if}

<h3>Tiles</h3>
<label class="field color"><span>Color</span><input type="color" bind:value={t.tile} /></label>
<Range label="Opacity" min={0} max={1} step={0.01} unit="%" bind:value={t.tileOpacity} />
<Range label="Blur behind" min={0} max={40} unit="px" bind:value={t.blur} />
<Range label="Corner radius" min={0} max={60} unit="px" bind:value={t.radius} />

<h3>Text</h3>
<label class="field color"><span>Text color</span><input type="color" bind:value={t.text} /></label>
<label class="field color"><span>Highlight color</span><input type="color" bind:value={t.accent} /></label>
<label class="field">
  <span>Font</span>
  <input list="fonts" bind:value={t.font} placeholder="Any font installed on this computer" />
  <datalist id="fonts">
    <option value="system">System</option>
    <option value="rounded">Rounded</option>
    <option value="serif">Serif</option>
    <option value="mono">Monospace</option>
  </datalist>
</label>

<h3>Links</h3>
<Segmented label="Names" options={[['hover', 'On hover'], ['always', 'Always'], ['never', 'Hidden']]} bind:value={t.labels} />
<label class="check"><input type="checkbox" bind:checked={t.newTab} /> Open in a new tab</label>

<h3>Page</h3>
<label class="field"><span>Tab title</span><input bind:value={t.pageTitle} /></label>
<label class="check"><input type="checkbox" bind:checked={t.editCorner} /> Edit button in the bottom corner</label>

<h3>Custom CSS</h3>
<p class="hint">Applied last. Target tile types with <code>[data-kind="clock"]</code>; each tile's settings show its own selector.</p>
<textarea class="code" bind:value={t.css} spellcheck="false" placeholder={'.tile {\n  border: 1px solid #fff2;\n}'}></textarea>

<h3>Backup</h3>
<div class="row">
  <a class="button" href={exportHref} download="foyer-layout.json">Export</a>
  <label class="button">Import<input type="file" accept="application/json,.json" class="sr-only" onchange={importFile} /></label>
  <button class="button danger" onclick={reset}>Reset</button>
</div>
{#if importError}<p class="error">{importError}</p>{/if}
