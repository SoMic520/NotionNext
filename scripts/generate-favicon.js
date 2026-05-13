const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const root = path.resolve(__dirname, '..')
const publicDir = path.join(root, 'public')
const outPath = path.join(publicDir, 'favicon.ico')
const svgPath = path.join(publicDir, 'favicon.svg')

const svg = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sky" x1="26" y1="20" x2="230" y2="236" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FAF7EA"/>
      <stop offset="1" stop-color="#EAF7EE"/>
    </linearGradient>
    <linearGradient id="soilTop" x1="44" y1="116" x2="212" y2="160" gradientUnits="userSpaceOnUse">
      <stop stop-color="#9FD45E"/>
      <stop offset=".55" stop-color="#5EAA52"/>
      <stop offset="1" stop-color="#1F7F60"/>
    </linearGradient>
    <linearGradient id="soilSide" x1="60" y1="158" x2="194" y2="221" gradientUnits="userSpaceOnUse">
      <stop stop-color="#B97839"/>
      <stop offset=".55" stop-color="#8D683F"/>
      <stop offset="1" stop-color="#506A62"/>
    </linearGradient>
    <linearGradient id="leaf" x1="64" y1="62" x2="132" y2="126" gradientUnits="userSpaceOnUse">
      <stop stop-color="#B9E35D"/>
      <stop offset="1" stop-color="#2B8D5C"/>
    </linearGradient>
    <linearGradient id="stem" x1="123" y1="62" x2="138" y2="151" gradientUnits="userSpaceOnUse">
      <stop stop-color="#65B958"/>
      <stop offset="1" stop-color="#0B5B85"/>
    </linearGradient>
    <linearGradient id="node" x1="112" y1="22" x2="199" y2="105" gradientUnits="userSpaceOnUse">
      <stop stop-color="#44A7BE"/>
      <stop offset="1" stop-color="#0A4C78"/>
    </linearGradient>
    <filter id="shadow" x="18" y="12" width="220" height="224" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#053047" flood-opacity="0.24"/>
    </filter>
  </defs>

  <rect width="256" height="256" rx="48" fill="url(#sky)"/>

  <g filter="url(#shadow)" stroke="#063F5F" stroke-linecap="round" stroke-linejoin="round">
    <!-- network crown -->
    <g fill="none" stroke="#1E7890" stroke-width="7">
      <path d="M128 58 156 28 184 44 203 75 190 109 155 126 124 114 108 82Z"/>
      <path d="M128 58 156 28 156 78 184 44 176 82 203 75 176 82 190 109 155 126 156 78 124 114 128 58"/>
      <path d="M108 82 156 78 176 82 155 126"/>
    </g>
    <g fill="url(#node)" stroke="#063F5F" stroke-width="5">
      <circle cx="156" cy="28" r="12"/>
      <circle cx="184" cy="44" r="9"/>
      <circle cx="203" cy="75" r="11"/>
      <circle cx="190" cy="109" r="11"/>
      <circle cx="155" cy="126" r="11"/>
      <circle cx="124" cy="114" r="9"/>
      <circle cx="108" cy="82" r="10"/>
      <circle cx="128" cy="58" r="8"/>
      <circle cx="156" cy="78" r="10"/>
      <circle cx="176" cy="82" r="8"/>
    </g>

    <!-- leaf and stem -->
    <path d="M126 143C126 110 140 81 160 56" stroke="url(#stem)" stroke-width="16" fill="none"/>
    <path d="M124 143C124 104 113 82 90 66" stroke="url(#stem)" stroke-width="14" fill="none"/>
    <path d="M46 74C87 69 115 86 125 122C88 121 55 107 46 74Z" fill="url(#leaf)" stroke="#063F5F" stroke-width="8"/>
    <path d="M69 87C91 93 108 105 124 122" fill="none" stroke="#064760" stroke-width="5"/>
    <rect x="118" y="119" width="18" height="55" rx="9" fill="url(#stem)" stroke="#063F5F" stroke-width="5"/>

    <!-- soil cube top -->
    <path d="M42 143 128 105 214 143 128 181Z" fill="url(#soilTop)" stroke="#063F5F" stroke-width="8"/>
    <path d="M42 143v42l86 48v-52Z" fill="#9D6B37" stroke="#063F5F" stroke-width="8"/>
    <path d="M214 143v42l-86 48v-52Z" fill="url(#soilSide)" stroke="#063F5F" stroke-width="8"/>
    <path d="M42 166c25 15 57 17 86 36 26-17 55-18 86-36" fill="none" stroke="#065A82" stroke-width="7"/>
    <path d="M42 188c30 18 56 17 86 36 26-17 55-17 86-36" fill="none" stroke="#065A82" stroke-width="7"/>

    <!-- fields on top -->
    <path d="M70 140 103 126 130 136 94 153Z" fill="#B4D766" stroke="#063F5F" stroke-width="5"/>
    <path d="M134 135 166 121 192 134 160 150Z" fill="#D7A95B" stroke="#063F5F" stroke-width="5"/>
    <path d="M104 159 128 148 153 160 128 174Z" fill="#58B9C9" stroke="#063F5F" stroke-width="5"/>
    <circle cx="128" cy="145" r="19" fill="#8A5B2D" opacity=".62"/>

    <!-- stones -->
    <g fill="#D9B06C" stroke="none" opacity=".86">
      <ellipse cx="63" cy="177" rx="8" ry="4"/>
      <ellipse cx="96" cy="198" rx="7" ry="5"/>
      <ellipse cx="173" cy="201" rx="7" ry="5"/>
      <ellipse cx="196" cy="171" rx="6" ry="4"/>
      <ellipse cx="78" cy="213" rx="5" ry="4"/>
      <ellipse cx="151" cy="220" rx="6" ry="4"/>
    </g>
  </g>
</svg>`

function icoHeader(images) {
  const headerSize = 6
  const entrySize = 16
  const count = images.length
  const header = Buffer.alloc(headerSize + entrySize * count)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(count, 4)

  let offset = header.length
  images.forEach((image, index) => {
    const base = headerSize + entrySize * index
    header.writeUInt8(image.size >= 256 ? 0 : image.size, base)
    header.writeUInt8(image.size >= 256 ? 0 : image.size, base + 1)
    header.writeUInt8(0, base + 2)
    header.writeUInt8(0, base + 3)
    header.writeUInt16LE(1, base + 4)
    header.writeUInt16LE(32, base + 6)
    header.writeUInt32LE(image.buffer.length, base + 8)
    header.writeUInt32LE(offset, base + 12)
    offset += image.buffer.length
  })

  return header
}

async function main() {
  fs.mkdirSync(publicDir, { recursive: true })
  fs.writeFileSync(svgPath, svg.trim() + '\n')

  const sizes = [16, 32, 48, 64, 128, 256]
  const images = []
  for (const size of sizes) {
    const buffer = await sharp(Buffer.from(svg))
      .resize(size, size, { fit: 'contain' })
      .png()
      .toBuffer()
    images.push({ size, buffer })
  }

  const ico = Buffer.concat([icoHeader(images), ...images.map(image => image.buffer)])
  fs.writeFileSync(outPath, ico)
  console.log(`[favicon] generated ${path.relative(root, outPath)} (${ico.length} bytes)`)
}

main().catch(error => {
  console.error('[favicon] failed to generate favicon.ico', error)
  process.exit(1)
})
