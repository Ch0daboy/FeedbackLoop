interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  private configs: Map<string, RateLimitConfig> = new Map()

  constructor() {
    // Default rate limits for different services
    this.configs.set('gemini', { maxRequests: 60, windowMs: 60000 }) // 60 requests per minute
    this.configs.set('claude', { maxRequests: 50, windowMs: 60000 }) // 50 requests per minute
    this.configs.set('github', { maxRequests: 5000, windowMs: 3600000 }) // 5000 requests per hour
  }

  setConfig(service: string, config: RateLimitConfig) {
    this.configs.set(service, config)
  }

  async checkLimit(service: string, identifier: string = 'default'): Promise<boolean> {
    const config = this.configs.get(service)
    if (!config) {
      return true // No limit configured
    }

    const key = `${service}:${identifier}`
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now >= entry.resetTime) {
      // Reset or create new entry
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return true
    }

    if (entry.count >= config.maxRequests) {
      return false // Rate limit exceeded
    }

    // Increment count
    entry.count++
    this.limits.set(key, entry)
    return true
  }

  async waitForLimit(service: string, identifier: string = 'default'): Promise<void> {
    const config = this.configs.get(service)
    if (!config) {
      return
    }

    const key = `${service}:${identifier}`
    const entry = this.limits.get(key)

    if (entry && entry.count >= config.maxRequests) {
      const waitTime = entry.resetTime - Date.now()
      if (waitTime > 0) {
        console.log(`Rate limit reached for ${service}, waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  getRemainingRequests(service: string, identifier: string = 'default'): number {
    const config = this.configs.get(service)
    if (!config) {
      return Infinity
    }

    const key = `${service}:${identifier}`
    const entry = this.limits.get(key)
    const now = Date.now()

    if (!entry || now >= entry.resetTime) {
      return config.maxRequests
    }

    return Math.max(0, config.maxRequests - entry.count)
  }

  getResetTime(service: string, identifier: string = 'default'): number | null {
    const key = `${service}:${identifier}`
    const entry = this.limits.get(key)
    
    if (!entry) {
      return null
    }

    return entry.resetTime
  }

  // Clean up expired entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key)
      }
    }
  }
}

export const rateLimiter = new RateLimiter()

// Clean up expired entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup()
}, 5 * 60 * 1000)

export async function withRateLimit<T>(
  service: string,
  fn: () => Promise<T>,
  identifier?: string
): Promise<T> {
  await rateLimiter.waitForLimit(service, identifier)
  
  const canProceed = await rateLimiter.checkLimit(service, identifier)
  if (!canProceed) {
    throw new Error(`Rate limit exceeded for ${service}`)
  }

  return fn()
}
