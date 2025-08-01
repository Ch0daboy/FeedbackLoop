import { z } from 'zod'

export const feedbackSubmissionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000, 'Description must be less than 5000 characters'),
  email: z.string().email('Invalid email address').optional(),
  projectId: z.string().cuid('Invalid project ID'),
})

export const feedbackUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['PENDING', 'ANALYZING', 'ANALYZED', 'IMPLEMENTING', 'IMPLEMENTED', 'REJECTED']).optional(),
})

export const feedbackQuerySchema = z.object({
  projectId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'ANALYZING', 'ANALYZED', 'IMPLEMENTING', 'IMPLEMENTED', 'REJECTED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  page: z.string().transform(Number).pipe(z.number().min(1)).default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default('10'),
  search: z.string().optional(),
})

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>
export type FeedbackUpdate = z.infer<typeof feedbackUpdateSchema>
export type FeedbackQuery = z.infer<typeof feedbackQuerySchema>
