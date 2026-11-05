<script lang="ts">
  import { palettes, type Look, type LookKey } from '../config'
  import FontField from './FontField.svelte'
  import Segmented from './Segmented.svelte'
  import Swatches from './Swatches.svelte'

  // The same fields set the page's look and a selection's own look, split by what they change:
  // the tile itself, the text on it, and the site icons in it.
  // get returns undefined when the selected tiles disagree on a value.
  let {
    get,
    set,
    tile = 'Tile',
    text = true,
    icons = true,
  }: {
    get: <K extends LookKey>(key: K) => Look[K] | undefined
    set: <K extends LookKey>(key: K, value: Look[K]) => void
    tile?: string
    text?: boolean
    icons?: boolean
  } = $props()

  // Two-way binding for one look key; undefined (mixed) is never written back.
  const bind = <K extends LookKey>(key: K) => [() => get(key), (v: Look[K] | undefined) => v !== undefined && set(key, v)] as const
  const [fill, setFill]       = bind('fill')
  const [color, setColor]     = bind('fillColor')
  const [opacity, setOpacity] = bind('fillOpacity')
  const [frost, setFrost]     = bind('frost')
  const [corners, setCorners] = bind('corners')
  const [ink, setInk]         = bind('text')
  const [size, setSize]       = bind('iconSize')
  const [shape, setShape]     = bind('iconShape')
  const [labels, setLabels]   = bind('labels')
</script>

{#snippet fillPreview(v: Look['fill'])}<span class="pv-tile fill-{v}"></span>{/snippet}
{#snippet cornerPreview(v: Look['corners'])}<span class="pv-tile corners-{v}"></span>{/snippet}
{#snippet sizePreview(v: Look['iconSize'])}<span class="pv-tile"><span class="pv-icon size-{v}"></span></span>{/snippet}
{#snippet shapePreview(v: Look['iconShape'])}<span class="pv-tile"><span class="pv-icon shape-{v}"></span></span>{/snippet}
{#snippet labelPreview(v: Look['labels'])}<span class="pv-tile labels-{v}"><span class="pv-icon"></span><span class="pv-label"></span></span>{/snippet}

<section>
  <h3>{tile}</h3>
  <Segmented label="Background" options={[['none', 'None'], ['glass', 'Frosted'], ['solid', 'Color']]} bind:value={fill, setFill} preview={fillPreview} />
  {#if get('fill') !== 'none'}
    <Swatches label="Color" colors={palettes.ink} bind:value={color, setColor} />
    <Segmented label="Opacity" options={[['5', '5%'], ['10', '10%'], ['20', '20%'], ['40', '40%'], ['70', '70%'], ['100', '100%']]} bind:value={opacity, setOpacity} />
    {#if get('fill') === 'glass'}
      <Segmented label="Frost" options={[['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']]} bind:value={frost, setFrost} />
    {/if}
  {/if}
  <Segmented label="Corners" options={[['square', 'Square'], ['soft', 'Rounded'], ['round', 'Round']]} bind:value={corners, setCorners} preview={cornerPreview} />
</section>

{#if text}
  <section>
    <h3>Text</h3>
    <Swatches label="Color" colors={palettes.ink} bind:value={ink, setInk} />
    <FontField value={get('font')} set={v => set('font', v)} />
  </section>
{/if}

{#if icons}
  <section>
    <h3>Site icons</h3>
    <Segmented label="Size" options={[['s', 'Small'], ['m', 'Medium'], ['l', 'Large']]} bind:value={size, setSize} preview={sizePreview} />
    <Segmented label="Corners" options={[['square', 'Square'], ['rounded', 'Rounded'], ['circle', 'Circle']]} bind:value={shape, setShape} preview={shapePreview} />
    <Segmented label="Names" options={[['hover', 'On hover'], ['always', 'Always'], ['never', 'Never']]} bind:value={labels, setLabels} preview={labelPreview} />
  </section>
{/if}
