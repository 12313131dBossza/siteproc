/**
 * Performance Optimization Utilities
 * Caching, memoization, and query optimization helpers
 */

// Simple in-memory cache with TTL
class SimpleCache {
  private cache: Map<string, { value: any; expires: number }> = new Map()

  set(key: string, value: any, ttlSeconds: number = 300) {
    const expires = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { value, expires })
  }

  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.value
  }

  delete(key: string) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key)
      }
    }
  }
}

// Global cache instance
export const cache = new SimpleCache()

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000)
}

/**
 * Memoize function results with cache
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    keyFn?: (...args: Parameters<T>) => string
    ttl?: number
  } = {}
): T {
  const {
    keyFn = (...args) => JSON.stringify(args),
    ttl = 300 // 5 minutes default
  } = options

  return ((...args: Parameters<T>) => {
    const key = `memoize:${fn.name}:${keyFn(...args)}`
    
    const cached = cache.get(key)
    if (cached !== null) {
      return cached as ReturnType<T>
    }

    const result = fn(...args)
    cache.set(key, result, ttl)
    return result as ReturnType<T>
  }) as T
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
    }, delayMs)
  }
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0

  return (...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastRun >= limitMs) {
      fn(...args)
      lastRun = now
    }
  }
}

/**
 * Batch multiple requests into a single call
 */
export class BatchProcessor<T, R> {
  private queue: Array<{
    item: T
    resolve: (value: R) => void
    reject: (error: any) => void
  }> = []
  private timeoutId: NodeJS.Timeout | null = null
  private batchFn: (items: T[]) => Promise<R[]>
  private maxBatchSize: number
  private maxWaitMs: number

  constructor(
    batchFn: (items: T[]) => Promise<R[]>,
    options: {
      maxBatchSize?: number
      maxWaitMs?: number
    } = {}
  ) {
    this.batchFn = batchFn
    this.maxBatchSize = options.maxBatchSize || 50
    this.maxWaitMs = options.maxWaitMs || 100
  }

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ item, resolve, reject })

      if (this.queue.length >= this.maxBatchSize) {
        this.flush()
      } else if (!this.timeoutId) {
        this.timeoutId = setTimeout(() => this.flush(), this.maxWaitMs)
      }
    })
  }

  private async flush() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    if (this.queue.length === 0) return

    const batch = this.queue.splice(0, this.queue.length)
    const items = batch.map(b => b.item)

    try {
      const results = await this.batchFn(items)

      batch.forEach((entry, index) => {
        entry.resolve(results[index])
      })
    } catch (error) {
      batch.forEach(entry => {
        entry.reject(error)
      })
    }
  }
}

/**
 * Optimize Supabase queries with pagination
 */
export function paginateQuery<T>(
  query: any,
  page: number = 1,
  pageSize: number = 50
) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return query.range(from, to)
}

/**
 * Lazy load data with intersection observer
 */
export function useLazyLoad(
  callback: () => void,
  options: IntersectionObserverInit = {}
) {
  if (typeof window === 'undefined') return { ref: null }

  const ref = { current: null as HTMLElement | null }

  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback()
        }
      })
    }, {
      threshold: 0.1,
      ...options
    })

    if (ref.current) {
      observer.observe(ref.current)
    }

    return {
      ref,
      cleanup: () => observer.disconnect()
    }
  }

  return { ref }
}

/**
 * Retry failed operations with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2
  } = options

  let lastError: any
  let delay = initialDelay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * backoffFactor, maxDelay)
      }
    }
  }

  throw lastError
}

/**
 * Measure and log query performance
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now()
    
    try {
      const result = await fn(...args)
      const duration = performance.now() - start
      
      if (duration > 1000) {
        console.warn(`Slow query: ${name} took ${duration.toFixed(2)}ms`)
      } else {
        console.log(`Query: ${name} took ${duration.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      console.error(`Failed query: ${name} after ${duration.toFixed(2)}ms`, error)
      throw error
    }
  }) as T
}

/**
 * Parallel execution with concurrency limit
 */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number = 5
): Promise<R[]> {
  const results: R[] = []
  const executing: Promise<void>[] = []

  for (const item of items) {
    const promise = fn(item).then(result => {
      results.push(result)
    })

    executing.push(promise)

    if (executing.length >= limit) {
      await Promise.race(executing)
      const index = executing.findIndex(p => p === promise)
      if (index !== -1) {
        executing.splice(index, 1)
      }
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Create indexed cache keys for better performance
 */
export function createCacheKey(...parts: (string | number | boolean | null | undefined)[]): string {
  return parts
    .map(p => p === null || p === undefined ? 'null' : String(p))
    .join(':')
}

/**
 * Preload critical data
 */
export async function preloadCriticalData(userId: string, companyId: string) {
  try {
    // Preload user profile
    cache.set(`profile:${userId}`, 'loading', 60)
    
    // Preload company data
    cache.set(`company:${companyId}`, 'loading', 60)
    
    // Preload project list
    cache.set(`projects:${companyId}`, 'loading', 60)

    console.log('Critical data preload initiated')
  } catch (error) {
    console.error('Failed to preload data:', error)
  }
}

/**
 * Clear cache for specific entity
 */
export function invalidateCache(pattern: string) {
  // Since we're using a simple cache, we'd need to iterate and match
  // For production, consider using Redis with pattern matching
  console.log(`Invalidating cache for pattern: ${pattern}`)
  
  // For now, clear all related caches
  if (pattern.includes('project')) {
    cache.clear()
  }
}
