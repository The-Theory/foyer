<script lang="ts">
  import { favicon, linkName, type Link } from '../config'

  let { link }: { link: Link } = $props()

  const src  = $derived(link.icon.type === 'image' ? link.icon.src : link.icon.type === 'auto' && link.url ? favicon(link.url) : '')
  const text = $derived(link.icon.type === 'text' ? link.icon.value : linkName(link).slice(0, 1).toUpperCase())
  // Longer text gets smaller so it stays inside the icon. Counted in characters as seen, so an emoji is one.
  const length = $derived(Math.min(Math.max([...new Intl.Segmenter().segment(text)].length, 1), 4))

  let failed = $state('')
</script>

{#if src && failed !== src}
  <img class="icon" {src} alt="" draggable="false" onerror={() => (failed = src)} />
{:else}
  <span class="icon glyph len-{length}" data-icon={link.icon.type === 'text' ? link.id : undefined}><span>{text}</span></span>
{/if}
