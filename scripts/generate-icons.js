#!/usr/bin/env node
// Generates icon-192.png and icon-512.png in public/ — no dependencies required
import zlib from 'zlib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'public')

function crc32(buf) {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[i] = c
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crcVal = Buffer.alloc(4); crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crcVal])
}

function solidPNG(size, r, g, b) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr.writeUInt8(8, 8); ihdr.writeUInt8(2, 9) // 8-bit RGB

  // Row = 1 filter byte + size*3 colour bytes
  const raw = Buffer.alloc((3 * size + 1) * size)
  for (let y = 0; y < size; y++) {
    const off = y * (3 * size + 1)
    raw[off] = 0 // None filter
    for (let x = 0; x < size; x++) {
      raw[off + 1 + x * 3] = r
      raw[off + 2 + x * 3] = g
      raw[off + 3 + x * 3] = b
    }
  }

  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// LabLens purple #6b4fff = rgb(107, 79, 255)
const R = 107, G = 79, B = 255
fs.writeFileSync(path.join(outDir, 'icon-192.png'), solidPNG(192, R, G, B))
fs.writeFileSync(path.join(outDir, 'icon-512.png'), solidPNG(512, R, G, B))
console.log('✓ public/icon-192.png (192×192)')
console.log('✓ public/icon-512.png (512×512)')
