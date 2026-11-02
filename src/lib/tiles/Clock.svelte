<script lang="ts">
  import type { ClockTile } from '../config'

  let { tile }: { tile: ClockTile } = $props()

  let now = $state(new Date())
  $effect(() => {
    const timer = setInterval(() => (now = new Date()), 1000)
    return () => clearInterval(timer)
  })

  const parts = $derived(new Intl.DateTimeFormat([], {
    hour:   tile.hour12 ? 'numeric' : '2-digit',
    minute: '2-digit',
    second: tile.seconds ? '2-digit' : undefined,
    hour12: tile.hour12,
  }).formatToParts(now))

  const time   = $derived(parts.filter(p => p.type !== 'dayPeriod').map(p => p.value).join('').trim())
  const period = $derived(parts.find(p => p.type === 'dayPeriod')?.value)
  const date   = $derived(now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))
</script>

<div class="clock">
  <time class="time">{time}{#if period}<span class="period">{period}</span>{/if}</time>
  {#if tile.date}<p class="date">{date}</p>{/if}
</div>
