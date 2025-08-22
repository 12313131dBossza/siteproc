// Client-side offline utilities
export type QueuedRequest = {
  id: string
  url: string
  method: string
  headers?: Record<string, string>
  body?: any
  retries?: number
}

const KEY = 'offline_queue_v1'

export function getQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setQueue(q: QueuedRequest[]) {
  localStorage.setItem(KEY, JSON.stringify(q))
  window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: q.length }))
}

export function pendingCount() {
  return getQueue().length
}

export async function compressDataUrl(dataUrl: string, maxBytes = 1_200_000): Promise<string> {
  // Compress using canvas downscale + quality loop
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height))
      canvas.width = Math.floor(img.width * scale)
      canvas.height = Math.floor(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      let q = 0.92
      let out = canvas.toDataURL('image/jpeg', q)
      while (out.length > maxBytes && q > 0.4) {
        q -= 0.08
        out = canvas.toDataURL('image/jpeg', q)
      }
      resolve(out)
    }
    img.src = dataUrl
  })
}

export function enqueue(req: Omit<QueuedRequest, 'id' | 'retries'>) {
  const q = getQueue()
  q.push({ ...req, id: crypto.randomUUID(), retries: 0 })
  setQueue(q)
}

export async function flush() {
  const q = getQueue()
  const remain: QueuedRequest[] = []
  for (const item of q) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body ? JSON.stringify(item.body) : undefined,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (e) {
      const retries = (item.retries || 0) + 1
      if (retries < 5) remain.push({ ...item, retries })
    }
  }
  setQueue(remain)
}
export function remove(id: string) { const q = getQueue().filter(q => q.id !== id); setQueue(q) }
export function clearQueue() { setQueue([]) }

export function installAutoFlush() {
  window.addEventListener('online', () => flush())
}
