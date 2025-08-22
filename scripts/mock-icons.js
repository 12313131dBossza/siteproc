// Improved mock icon generator: creates simple branded gradient PNGs (192 & 512)
// Falls back to 1x1 placeholders if 'canvas' is not installed.
const fs = require('fs')
const path = require('path')
let createCanvas
try { ({ createCanvas } = require('canvas')) } catch { /* optional dependency */ }

const outDir = path.join(process.cwd(), 'public', 'icons')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

function placeholder() {
	return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=', 'base64')
}

function generate(size) {
	if (!createCanvas) return placeholder()
	const c = createCanvas(size, size)
	const ctx = c.getContext('2d')
	const grad = ctx.createLinearGradient(0, 0, size, size)
	grad.addColorStop(0, '#0f172a')
	grad.addColorStop(1, '#2563eb')
	ctx.fillStyle = grad
	ctx.fillRect(0, 0, size, size)
	ctx.fillStyle = '#fff'
	ctx.font = `${Math.floor(size * 0.55)}px sans-serif`
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	ctx.fillText('S', size / 2, size / 2 + size * 0.02)
	ctx.strokeStyle = 'rgba(255,255,255,0.15)'
	ctx.lineWidth = Math.max(2, size * 0.02)
	ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, size - ctx.lineWidth, size - ctx.lineWidth)
	return c.toBuffer('image/png')
}

for (const size of [192, 512]) {
	const buf = generate(size)
	fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf)
	console.log(`Generated icon-${size}.png (${buf.length} bytes)`) // eslint-disable-line no-console
}

console.log('Mock icons generation complete.')
