<script lang="ts">
  import { defaultConfig, parseConfig, type StyleKey, type Theme } from './config'
  import { app, closeSheet } from './state.svelte'
  import ColorInput from './ui/ColorInput.svelte'
  import ImageInput from './ui/ImageInput.svelte'
  import Range from './ui/Range.svelte'
  import Segmented from './ui/Segmented.svelte'
  import StyleFields from './ui/StyleFields.svelte'

  const t = $derived(app.config.theme)

  const get = <K extends StyleKey>(key: K) => t[key]
  const set = <K extends StyleKey>(key: K, value: Theme[K]) => (t[key] = value)

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
<ColorInput label="Color" bind:value={t.background} autofocus />
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
<p class="hint">Every tile starts with these. A tile's own settings can change any of them for that tile.</p>
<StyleFields {get} {set} />
<ColorInput label="Keyboard focus color" bind:value={t.accent} />

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
