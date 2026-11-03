<script lang="ts">
  import type { StyleKey, Theme } from '../config'
  import ColorInput from './ColorInput.svelte'
  import Range from './Range.svelte'

  // The same fields edit the page defaults (Appearance) and a single tile's overrides.
  let {
    get,
    set,
    frame = true,
    icons = true,
    iconSize = true,
  }: {
    get: <K extends StyleKey>(key: K) => Theme[K]
    set: <K extends StyleKey>(key: K, value: Theme[K]) => void
    frame?: boolean
    icons?: boolean
    iconSize?: boolean
  } = $props()
</script>

{#if frame}
  <ColorInput label="Background color" bind:value={() => get('tile'), v => set('tile', v)} />
  <Range label="Background opacity" min={0} max={1} step={0.01} unit="%" bind:value={() => get('tileOpacity'), v => set('tileOpacity', v)} />
  <Range label="Blur behind" min={0} max={40} unit="px" bind:value={() => get('blur'), v => set('blur', v)} />
{/if}
<Range label="Corner radius" min={0} max={60} unit="px" bind:value={() => get('radius'), v => set('radius', v)} />
<ColorInput label="Text color" bind:value={() => get('text'), v => set('text', v)} />
<label class="field">
  <span>Font</span>
  <input list="fonts" bind:value={() => get('font'), v => set('font', v)} placeholder="Any font installed on this computer" />
  <datalist id="fonts">
    <option value="system">System</option>
    <option value="rounded">Rounded</option>
    <option value="serif">Serif</option>
    <option value="mono">Monospace</option>
  </datalist>
</label>
{#if icons && iconSize}
  <Range label="Icon size" min={0.1} max={1} unit="%" bind:value={() => get('iconSize') / 100, v => set('iconSize', Math.round(v * 100))} step={0.01} />
{/if}
{#if icons}
  <Range label="Icon rounding" min={0} max={0.5} unit="%" bind:value={() => get('iconRadius') / 100, v => set('iconRadius', Math.round(v * 100))} step={0.01} />
{/if}
