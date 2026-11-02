<script lang="ts">
  import { focusOnMount } from '../nav'

  let { label, autofocus = false, value = $bindable() }: { label: string; autofocus?: boolean; value: string } = $props()
</script>

<label class="field color">
  <span>{label}<output>{value}</output></span>
  <input type="color" bind:value use:focusOnMount={autofocus} />
</label>
