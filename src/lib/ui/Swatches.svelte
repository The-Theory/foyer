<script lang="ts">
  // A few ready colors plus any color from the system picker. With none, a first swatch clears the
  // color (value ''), for things that otherwise follow their tile. value is undefined when the selected tiles disagree.
  let { label, colors, none, value = $bindable() }: { label: string; colors: string[]; none?: string; value: string | undefined } = $props()

  const custom = $derived(!!value && !colors.includes(value.toLowerCase()))
  const css    = $derived([...colors, value ?? ''].filter(Boolean).map(c => `[data-swatch="${c}"]{--swatch:${c}}`).join(''))
</script>

<svelte:head>
  <svelte:element this={'style'}>{css}</svelte:element>
</svelte:head>

<div class="field">
  <span>{label}</span>
  <div class="swatches" role="radiogroup" aria-label={label}>
    {#if none}
      <button type="button" role="radio" class="swatch none" aria-checked={value === ''} aria-label={none} title={none} onclick={() => (value = '')}></button>
    {/if}
    {#each colors as color (color)}
      <button type="button" role="radio" class="swatch" data-swatch={color} aria-checked={value?.toLowerCase() === color} aria-label={color} onclick={() => (value = color)}></button>
    {/each}
    <label class="swatch other" class:chosen={custom} data-swatch={custom ? value : undefined} title="Pick any color">
      <input type="color" class="sr-only" value={value || '#ffffff'} oninput={e => (value = e.currentTarget.value)} aria-label="{label}: pick any color" />
    </label>
  </div>
</div>
