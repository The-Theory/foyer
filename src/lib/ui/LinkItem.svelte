<script lang="ts">
  import { linkName, safeUrl, type Link } from '../config'
  import { navTarget } from '../nav'
  import { app } from '../state.svelte'
  import Icon from './Icon.svelte'

  let { link }: { link: Link } = $props()
</script>

<a
  class="item"
  href={safeUrl(link.url)}
  target={app.config.theme.newTab ? '_blank' : undefined}
  rel="noreferrer"
  title={linkName(link)}
  tabindex={app.editing ? -1 : undefined}
  use:navTarget={'view'}
>
  <Icon {link} />
  <span class="label">{linkName(link)}</span>
</a>
