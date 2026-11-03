<script lang="ts">
  import { fonts, palettes, type Look, type LookKey } from '../config'
  import Segmented from './Segmented.svelte'
  import Swatches from './Swatches.svelte'

  // The same fields set the page's look and a selection's own look.
  // get returns undefined when the selected tiles disagree on a value.
  let {
    get,
    set,
    icons = true,
  }: {
    get: <K extends LookKey>(key: K) => Look[K] | undefined
    set: <K extends LookKey>(key: K, value: Look[K]) => void
    icons?: boolean
  } = $props()

  const font       = $derived(get('font'))
  const presetFont = $derived(font !== undefined && font in fonts)
</script>

{#snippet fillPreview(v: Look['fill'])}<span class="pv-fill {v}"></span>{/snippet}
{#snippet cornerPreview(v: Look['corners'])}<span class="pv-corners {v}"></span>{/snippet}
{#snippet fontPreview(v: string)}<span class="pv-font {v}">Aa</span>{/snippet}
{#snippet sizePreview(v: Look['iconSize'])}<span class="pv-icon size-{v}"></span>{/snippet}
{#snippet shapePreview(v: Look['iconShape'])}<span class="pv-icon shape-{v}"></span>{/snippet}

<Segmented label="Background" options={[['none', 'None'], ['glass', 'Frosted'], ['solid', 'Color']]} bind:value={() => get('fill'), v => v && set('fill', v)} preview={fillPreview} />
{#if get('fill') !== 'none'}
  <Swatches label="Color" colors={palettes.ink} bind:value={() => get('fillColor'), v => v && set('fillColor', v)} />
  <Segmented
    label="Opacity"
    options={[['5', '5%'], ['10', '10%'], ['20', '20%'], ['40', '40%'], ['70', '70%'], ['100', '100%']]}
    bind:value={() => get('fillOpacity'), v => v && set('fillOpacity', v)}
  />
  {#if get('fill') === 'glass'}
    <Segmented label="Frost" options={[['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']]} bind:value={() => get('frost'), v => v && set('frost', v)} />
  {/if}
{/if}
<Segmented label="Corners" options={[['square', 'Square'], ['soft', 'Rounded'], ['round', 'Round']]} bind:value={() => get('corners'), v => v && set('corners', v)} preview={cornerPreview} />
<Swatches label="Text color" colors={palettes.ink} bind:value={() => get('text'), v => v && set('text', v)} />
<Segmented
  label="Font"
  options={[['system', 'System'], ['rounded', 'Rounded'], ['serif', 'Serif'], ['mono', 'Mono']]}
  bind:value={() => (presetFont ? font : undefined), v => v && set('font', v)}
  preview={fontPreview}
/>
<label class="field">
  <span>Custom font</span>
  <input value={presetFont ? '' : (font ?? '')} placeholder="Helvetica Neue" onchange={e => e.currentTarget.value.trim() && set('font', e.currentTarget.value.trim())} />
</label>
{#if icons}
  <Segmented label="Icon size" options={[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]} bind:value={() => get('iconSize'), v => v && set('iconSize', v)} preview={sizePreview} />
  <Segmented label="Icon shape" options={[['square', 'Square'], ['rounded', 'Rounded'], ['circle', 'Circle']]} bind:value={() => get('iconShape'), v => v && set('iconShape', v)} preview={shapePreview} />
{/if}
