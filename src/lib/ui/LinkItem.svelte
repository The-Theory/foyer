<script lang="ts">
  import { linkName, safeUrl, type Link } from '../config'
  import { app } from '../state.svelte'
  import Icon from './Icon.svelte'

  let { link }: { link: Link } = $props()
</script>

<a class="item" href={safeUrl(link.url)} target={app.config.theme.newTab ? '_blank' : undefined} rel="noreferrer" title={linkName(link)}>
  <Icon {link} />
  <span class="label">{linkName(link)}</span>
</a>
