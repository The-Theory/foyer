<script lang="ts">
  let { label, value = $bindable() }: { label: string; value: string } = $props()

  const isUpload = $derived(value.startsWith('data:'))

  function pick(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => (value = String(reader.result))
    reader.readAsDataURL(file)
  }
</script>

<div class="field">
  <span>{label}</span>
  <div class="row">
    {#if isUpload}
      <span class="file">Uploaded image</span>
    {:else}
      <input type="url" placeholder="Image address" bind:value />
    {/if}
    <label class="button">Upload<input type="file" accept="image/*" class="sr-only" onchange={pick} /></label>
    {#if value}<button type="button" class="button" onclick={() => (value = '')}>Remove</button>{/if}
  </div>
</div>
