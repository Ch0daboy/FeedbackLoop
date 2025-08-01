import { z } from 'zod'

const configSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  APP_URL: z.string().url(),
  
  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  
  // OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  
  // AI APIs
  GOOGLE_GEMINI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  
  // GitHub
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_APP_ID: z.string().min(1).optional(),
  GITHUB_PRIVATE_KEY: z.string().min(1).optional(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1).optional(),
  
  // Email
  EMAIL_FROM: z.string().email(),
  RESEND_API_KEY: z.string().min(1),
  
  // Security
  ENCRYPTION_KEY: z.string().min(32),
  
  // Optional
  PERPLEXITY_API_KEY: z.string().min(1).optional(),
})

function validateConfig() {
  try {
    return configSchema.parse(process.env)
  } catch (error) {
    console.error('❌ Invalid environment variables:', error)
    throw new Error('Invalid environment variables')
  }
}

export const config = validateConfig()

export type Config = z.infer<typeof configSchema>
