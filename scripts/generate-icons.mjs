// Dependency-free PNG generation. Run `npm run icons` when changing the identity.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const name = Buffer.from(type)
  const size = Buffer.alloc(4)
  size.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([size, name, data, crc])
}
function icon(size, maskable = false) {
  const pixels = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x / size * 64
      const py = y / size * 64
      let color = [55, 48, 163, 255]
      if (!maskable) {
        const dx = Math.max(14 - px, 0, px - 50)
        const dy = Math.max(14 - py, 0, py - 50)
        if (dx * dx + dy * dy > 14 * 14) color = [0, 0, 0, 0]
      }
      const scale = maskable ? 0.78 : 1
      const sx = (px - 32) / scale + 32
      const sy = (py - 32) / scale + 32
      const radius = Math.hypot(sx - 30, sy - 32)
      const ring = sx >= 30 && radius >= 12 && radius <= 18
      const stem = sx >= 17 && sx <= 23 && sy >= 14 && sy <= 50
      const caps = sx >= 20 && sx <= 30 && ((sy >= 14 && sy <= 20) || (sy >= 44 && sy <= 50))
      if (ring || stem || caps) color = [255, 255, 255, 255]
      if ((sx - 47) ** 2 + (sy - 17) ** 2 <= 7 ** 2) color = [110, 231, 183, 255]
      const offset = y * (size * 4 + 1) + 1 + x * 4
      color.forEach((value, index) => { pixels[offset + index] = value })
    }
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8
  header[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ])
}
for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, false]]) {
  writeFileSync(fileURLToPath(new URL(`../public/${name}`, import.meta.url)), icon(size, maskable))
}
