<script lang="ts" generics="T extends string">
  import type { Snippet } from 'svelte'

  // A row of choices. With a preview, each choice is a card showing what it looks like.
  // value is undefined when the selected tiles disagree.
  let {
    label,
    options,
    value = $bindable(),
    preview,
  }: { label: string; options: [T, string][]; value: T | undefined; preview?: Snippet<[T]> } = $props()
</script>

<div class="field">
  <span>{label}</span>
  <div class="segmented" class:cards={preview} role="radiogroup" aria-label={label}>
    {#each options as [option, text] (option)}
      <button type="button" role="radio" aria-checked={value === option} onclick={() => (value = option)}>
        {#if preview}<span class="preview" aria-hidden="true">{@render preview(option)}</span>{/if}
        {text}
      </button>
    {/each}
  </div>
</div>
