<script lang="ts">
  import { safeUrl, type WebTile } from '../config'
  import { app } from '../state.svelte'

  let { tile }: { tile: WebTile } = $props()

  let online = $state(navigator.onLine)
</script>

<svelte:window ononline={() => (online = true)} onoffline={() => (online = false)} />

<div class="web zoom-{tile.zoom}">
  {#if !tile.url}
    <p class="hint padded">No address set</p>
  {:else if !online}
    <p class="offline">{tile.offline || 'Offline'}</p>
  {:else}
    <!-- Sandboxed so the site can't navigate the new tab page away. Out of the tab order while editing. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <iframe
      src={safeUrl(tile.url)}
      title={tile.url}
      referrerpolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      tabindex={app.editing ? -1 : undefined}
    ></iframe>
  {/if}
</div>
