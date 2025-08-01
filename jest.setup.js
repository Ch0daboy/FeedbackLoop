import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key'
process.env.ANTHROPIC_API_KEY = 'test-claude-key'
process.env.GITHUB_CLIENT_ID = 'test-github-id'
process.env.GITHUB_CLIENT_SECRET = 'test-github-secret'

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
