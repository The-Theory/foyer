<script lang="ts" generics="T extends string">
  let { label, options, value = $bindable() }: { label: string; options: [T, string][]; value: T } = $props()
</script>

<div class="field">
  <span>{label}</span>
  <div class="segmented" role="radiogroup" aria-label={label}>
    {#each options as [option, text] (option)}
      <button type="button" role="radio" aria-checked={value === option} onclick={() => (value = option)}>{text}</button>
    {/each}
  </div>
</div>
