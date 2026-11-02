<script lang="ts">
  let { label, min, max, step = 1, unit = '', value = $bindable() }: { label: string; min: number; max: number; step?: number; unit?: string; value: number } = $props()

  const shown = $derived(unit === '%' ? Math.round(value * 100) : value)
</script>

<label class="field range">
  <span>{label}<output>{shown}{unit}</output></span>
  <input type="range" {min} {max} {step} bind:value />
</label>
