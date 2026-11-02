<script lang="ts">
  import type { Icon, Link } from '../config'
  import ImageInput from './ImageInput.svelte'
  import Segmented from './Segmented.svelte'

  let { link }: { link: Link } = $props()

  const blank: Record<Icon['type'], () => Icon> = {
    auto:  () => ({ type: 'auto' }),
    image: () => ({ type: 'image', src: '' }),
    text:  () => ({ type: 'text', value: '' }),
  }
</script>

<label class="field"><span>Name</span><input bind:value={link.title} placeholder="Shown on hover and in search" /></label>
<label class="field"><span>Address</span><input bind:value={link.url} placeholder="example.com" spellcheck="false" /></label>
<Segmented
  label="Icon"
  options={[['auto', 'Site icon'], ['image', 'Image'], ['text', 'Text']]}
  bind:value={() => link.icon.type, type => (link.icon = blank[type]())}
/>
{#if link.icon.type === 'image'}
  <ImageInput label="Icon image" bind:value={link.icon.src} />
{:else if link.icon.type === 'text'}
  <label class="field"><span>Icon text</span><input bind:value={link.icon.value} maxlength="4" placeholder="An emoji or a few letters" /></label>
{/if}
