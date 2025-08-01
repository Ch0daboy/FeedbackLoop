import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn()
}))

jest.mock('@/lib/db', () => ({
  db: {
    project: {
      findUnique: jest.fn()
    },
    feedback: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}))

jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))

import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockDb = db as jest.Mocked<typeof db>

describe('/api/feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should create feedback successfully', async () => {
      // Mock session
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any)

      // Mock project exists
      mockDb.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        owner: { id: 'user-1' }
      } as any)

      // Mock feedback creation
      const mockFeedback = {
        id: 'feedback-1',
        title: 'Test feedback',
        description: 'Test description',
        projectId: 'project-1',
        user: { id: 'user-1', name: 'Test User' },
        project: { id: 'project-1', name: 'Test Project' }
      }
      mockDb.feedback.create.mockResolvedValue(mockFeedback as any)

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test feedback',
          description: 'This is a test description that is long enough',
          projectId: 'project-1'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.feedback).toEqual(mockFeedback)
      expect(mockDb.feedback.create).toHaveBeenCalledWith({
        data: {
          title: 'Test feedback',
          description: 'This is a test description that is long enough',
          email: undefined,
          projectId: 'project-1',
          userId: 'user-1',
          status: 'PENDING'
        },
        include: expect.any(Object)
      })
    })

    it('should reject invalid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          title: '', // Invalid: empty title
          description: 'Short', // Invalid: too short
          projectId: 'invalid-id' // Invalid: not a CUID
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('should reject non-existent project', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any)

      // Mock project not found
      mockDb.project.findUnique.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test feedback',
          description: 'This is a test description that is long enough',
          projectId: 'clp123456789abcdef'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Project not found')
    })

    it('should handle anonymous feedback submission', async () => {
      // No session (anonymous user)
      mockGetServerSession.mockResolvedValue(null)

      // Mock project exists
      mockDb.project.findUnique.mockResolvedValue({
        id: 'project-1',
        name: 'Test Project',
        owner: { id: 'owner-1' }
      } as any)

      // Mock feedback creation
      const mockFeedback = {
        id: 'feedback-1',
        title: 'Anonymous feedback',
        description: 'Test description',
        email: 'anonymous@example.com',
        projectId: 'project-1',
        user: null,
        project: { id: 'project-1', name: 'Test Project' }
      }
      mockDb.feedback.create.mockResolvedValue(mockFeedback as any)

      const request = new NextRequest('http://localhost:3000/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Anonymous feedback',
          description: 'This is a test description that is long enough',
          email: 'anonymous@example.com',
          projectId: 'project-1'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(mockDb.feedback.create).toHaveBeenCalledWith({
        data: {
          title: 'Anonymous feedback',
          description: 'This is a test description that is long enough',
          email: 'anonymous@example.com',
          projectId: 'project-1',
          userId: null,
          status: 'PENDING'
        },
        include: expect.any(Object)
      })
    })
  })

  describe('GET', () => {
    it('should return feedback list for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any)

      const mockFeedback = [
        {
          id: 'feedback-1',
          title: 'Test feedback',
          status: 'PENDING',
          user: { id: 'user-1', name: 'Test User' },
          project: { id: 'project-1', name: 'Test Project' }
        }
      ]

      mockDb.feedback.findMany.mockResolvedValue(mockFeedback as any)
      mockDb.feedback.count.mockResolvedValue(1)

      const request = new NextRequest('http://localhost:3000/api/feedback?page=1&limit=10')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.feedback).toEqual(mockFeedback)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1
      })
    })

    it('should require authentication for feedback list', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/feedback')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should filter feedback by project', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'test@example.com' }
      } as any)

      // Mock project access check
      mockDb.project.findUnique.mockResolvedValue({
        id: 'project-1',
        ownerId: 'user-1'
      } as any)

      mockDb.feedback.findMany.mockResolvedValue([])
      mockDb.feedback.count.mockResolvedValue(0)

      const request = new NextRequest('http://localhost:3000/api/feedback?projectId=project-1')

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(mockDb.feedback.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object)
      })
    })
  })
})
