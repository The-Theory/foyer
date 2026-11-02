<script lang="ts">
  import { favicon, linkName, type Link } from '../config'

  let { link }: { link: Link } = $props()

  const src    = $derived(link.icon.type === 'image' ? link.icon.src : link.icon.type === 'auto' && link.url ? favicon(link.url) : '')
  const letter = $derived(link.icon.type === 'text' ? link.icon.value : linkName(link).slice(0, 1).toUpperCase())

  let failed = $state('')
</script>

{#if src && failed !== src}
  <img class="icon" {src} alt="" draggable="false" onerror={() => (failed = src)} />
{:else}
  <span class="icon glyph">{letter}</span>
{/if}
