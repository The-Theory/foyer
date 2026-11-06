// Icons are cut down to the box around their visible pixels, so a logo with wide transparent margins
// fills its icon like the rest. Anything that can't be read (a host without CORS or permission, not an
// image) is shown as it is.

const cache = new Map<string, Promise<string>>()

export function trimmed(src: string) {
  let job = cache.get(src)
  if (!job) cache.set(src, (job = trim(src).catch(() => src)))
  return job
}

const visible = 8 // alpha above this counts as picture; fainter is antialiasing haze

async function trim(src: string) {
  const image = await createImageBitmap(await (await fetch(src)).blob())
  const { width, height } = image
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return src
  ctx.drawImage(image, 0, 0)
  const alpha = ctx.getImageData(0, 0, width, height).data

  let left = width, top = height, right = -1, bottom = -1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[(y * width + x) * 4 + 3] <= visible) continue
      left   = Math.min(left, x)
      right  = Math.max(right, x)
      top    = Math.min(top, y)
      bottom = Math.max(bottom, y)
    }
  }
  const empty = right < 0
  const full  = left === 0 && top === 0 && right === width - 1 && bottom === height - 1
  if (empty || full) return src

  const w = right - left + 1, h = bottom - top + 1
  const out = new OffscreenCanvas(w, h)
  out.getContext('2d')?.drawImage(canvas, left, top, w, h, 0, 0, w, h)
  return URL.createObjectURL(await out.convertToBlob())
}
