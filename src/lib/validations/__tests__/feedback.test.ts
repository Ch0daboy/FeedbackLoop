import { 
  feedbackSubmissionSchema, 
  feedbackUpdateSchema, 
  feedbackQuerySchema 
} from '../feedback'

describe('Feedback Validation Schemas', () => {
  describe('feedbackSubmissionSchema', () => {
    it('should validate valid feedback submission', () => {
      const validData = {
        title: 'Test feedback title',
        description: 'This is a detailed description of the feedback that is long enough to pass validation.',
        email: 'test@example.com',
        projectId: 'clp123456789abcdef'
      }

      const result = feedbackSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject feedback with short title', () => {
      const invalidData = {
        title: '',
        description: 'This is a detailed description of the feedback that is long enough to pass validation.',
        projectId: 'clp123456789abcdef'
      }

      const result = feedbackSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Title is required')
      }
    })

    it('should reject feedback with short description', () => {
      const invalidData = {
        title: 'Valid title',
        description: 'Too short',
        projectId: 'clp123456789abcdef'
      }

      const result = feedbackSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 10 characters')
      }
    })

    it('should reject feedback with invalid email', () => {
      const invalidData = {
        title: 'Valid title',
        description: 'This is a detailed description of the feedback that is long enough to pass validation.',
        email: 'invalid-email',
        projectId: 'clp123456789abcdef'
      }

      const result = feedbackSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid email address')
      }
    })

    it('should reject feedback with invalid project ID', () => {
      const invalidData = {
        title: 'Valid title',
        description: 'This is a detailed description of the feedback that is long enough to pass validation.',
        projectId: 'invalid-id'
      }

      const result = feedbackSubmissionSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid project ID')
      }
    })

    it('should allow optional email', () => {
      const validData = {
        title: 'Test feedback title',
        description: 'This is a detailed description of the feedback that is long enough to pass validation.',
        projectId: 'clp123456789abcdef'
      }

      const result = feedbackSubmissionSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('feedbackUpdateSchema', () => {
    it('should validate valid feedback update', () => {
      const validData = {
        title: 'Updated title',
        priority: 'HIGH' as const,
        status: 'ANALYZED' as const
      }

      const result = feedbackUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid priority', () => {
      const invalidData = {
        priority: 'INVALID_PRIORITY'
      }

      const result = feedbackUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'INVALID_STATUS'
      }

      const result = feedbackUpdateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should allow empty update', () => {
      const result = feedbackUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('feedbackQuerySchema', () => {
    it('should validate valid query parameters', () => {
      const validData = {
        projectId: 'clp123456789abcdef',
        status: 'PENDING' as const,
        priority: 'HIGH' as const,
        page: '1',
        limit: '10',
        search: 'test query'
      }

      const result = feedbackQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should use default values for page and limit', () => {
      const result = feedbackQuerySchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
      }
    })

    it('should reject invalid page number', () => {
      const invalidData = {
        page: '0'
      }

      const result = feedbackQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject limit that is too high', () => {
      const invalidData = {
        limit: '200'
      }

      const result = feedbackQuerySchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
