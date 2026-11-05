<script lang="ts">
  import { fonts } from '../config'
  import Segmented from './Segmented.svelte'

  // A ready font, or any installed font by name. value is undefined when the selected tiles disagree.
  let { value, set }: { value: string | undefined; set: (font: string) => void } = $props()

  const preset = $derived(value !== undefined && value in fonts)
</script>

{#snippet fontPreview(v: string)}<span class="pv-font {v}">Aa</span>{/snippet}

<Segmented
  label="Font"
  options={[['system', 'System'], ['rounded', 'Rounded'], ['serif', 'Serif'], ['mono', 'Mono']]}
  bind:value={() => (preset ? value : undefined), v => v && set(v)}
  preview={fontPreview}
/>
<label class="field">
  <span>Other font</span>
  <input value={preset ? '' : (value ?? '')} placeholder="Helvetica Neue" onchange={e => e.currentTarget.value.trim() && set(e.currentTarget.value.trim())} />
</label>
