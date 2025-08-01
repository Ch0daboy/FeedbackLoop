export class AIServiceError extends Error {
  constructor(
    message: string,
    public service: 'gemini' | 'claude' | 'github',
    public originalError?: any,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AIServiceError'
  }
}

export class RateLimitError extends AIServiceError {
  constructor(service: 'gemini' | 'claude' | 'github', retryAfter?: number) {
    super(
      `Rate limit exceeded for ${service}${retryAfter ? ` (retry after ${retryAfter}s)` : ''}`,
      service,
      undefined,
      true
    )
    this.name = 'RateLimitError'
  }
}

export class QuotaExceededError extends AIServiceError {
  constructor(service: 'gemini' | 'claude' | 'github') {
    super(`Quota exceeded for ${service}`, service, undefined, false)
    this.name = 'QuotaExceededError'
  }
}

export class InvalidResponseError extends AIServiceError {
  constructor(service: 'gemini' | 'claude' | 'github', response?: any) {
    super(`Invalid response from ${service}`, service, response, true)
    this.name = 'InvalidResponseError'
  }
}

export function handleAIError(error: any, service: 'gemini' | 'claude' | 'github'): AIServiceError {
  // Handle specific error types based on the service
  if (service === 'gemini') {
    if (error.message?.includes('quota')) {
      return new QuotaExceededError(service)
    }
    if (error.message?.includes('rate limit')) {
      return new RateLimitError(service)
    }
    if (error.status === 429) {
      return new RateLimitError(service)
    }
  }

  if (service === 'claude') {
    if (error.status === 429) {
      return new RateLimitError(service)
    }
    if (error.status === 402) {
      return new QuotaExceededError(service)
    }
  }

  if (service === 'github') {
    if (error.status === 403 && error.message?.includes('rate limit')) {
      return new RateLimitError(service)
    }
    if (error.status === 403 && error.message?.includes('quota')) {
      return new QuotaExceededError(service)
    }
  }

  // Default to generic AI service error
  return new AIServiceError(
    error.message || `Unknown error from ${service}`,
    service,
    error,
    true
  )
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Don't retry on non-retryable errors
      if (error instanceof AIServiceError && !error.retryable) {
        throw error
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt)
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

export function isRetryableError(error: any): boolean {
  if (error instanceof AIServiceError) {
    return error.retryable
  }

  // Consider network errors as retryable
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true
  }

  // Consider 5xx errors as retryable
  if (error.status >= 500 && error.status < 600) {
    return true
  }

  return false
}
