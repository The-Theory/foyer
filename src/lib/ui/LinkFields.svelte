<script lang="ts">
  import { focusOnMount } from '../nav'
  import { hostOf, palettes, type Icon, type Link } from '../config'
  import FontField from './FontField.svelte'
  import ImageInput from './ImageInput.svelte'
  import Segmented from './Segmented.svelte'
  import Swatches from './Swatches.svelte'

  let { link, autofocus = false }: { link: Link; autofocus?: boolean } = $props()

  const blank: Record<Icon['type'], () => Icon> = {
    auto:  () => ({ type: 'auto' }),
    image: () => ({ type: 'image', src: '' }),
    text:  () => ({ type: 'text', value: '', font: 'system', color: '', background: '' }),
  }
</script>

<label class="field">
  <span>Address</span>
  <input bind:value={link.url} placeholder="github.com" spellcheck="false" use:focusOnMount={autofocus} />
</label>
<label class="field">
  <span>Name</span>
  <input bind:value={link.title} placeholder={link.url ? hostOf(link.url) : 'Uses the address if empty'} />
</label>
<Segmented
  label="Icon"
  options={[['auto', 'Site icon'], ['image', 'Image'], ['text', 'Text']]}
  bind:value={() => link.icon.type, type => (link.icon = blank[type]())}
/>
{#if link.icon.type === 'image'}
  <ImageInput label="Image" bind:value={link.icon.src} />
{:else if link.icon.type === 'text'}
  {@const icon = link.icon}
  <label class="field"><span>Text</span><input bind:value={icon.value} maxlength="4" placeholder="An emoji or up to 4 letters" /></label>
  <FontField value={icon.font ?? 'system'} set={font => (icon.font = font)} />
  <Swatches label="Text color" none="Default" colors={palettes.ink} bind:value={() => icon.color ?? '', v => (icon.color = v)} />
  <Swatches label="Background" none="Default" colors={palettes.ink} bind:value={() => icon.background ?? '', v => (icon.background = v)} />
{/if}
