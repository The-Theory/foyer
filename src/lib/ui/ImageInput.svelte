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
    <input
      type="url"
      placeholder="Paste an image URL"
      value={isUpload ? '' : value}
      oninput={e => (value = e.currentTarget.value)}
      disabled={isUpload}
    />
    <label class="button">Upload<input type="file" accept="image/*" hidden onchange={pick} /></label>
    {#if value}<button type="button" class="button" onclick={() => (value = '')}>Clear</button>{/if}
  </div>
  {#if isUpload}<small>Using an uploaded image.</small>{/if}
</div>
