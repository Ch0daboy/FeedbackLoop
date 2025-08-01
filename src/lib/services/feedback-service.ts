import { db } from '@/lib/db'
import { FeedbackSubmission, FeedbackUpdate, FeedbackQuery } from '@/lib/validations/feedback'

export class FeedbackService {
  static async createFeedback(data: FeedbackSubmission & { userId?: string }) {
    return db.feedback.create({
      data: {
        title: data.title,
        description: data.description,
        email: data.email,
        projectId: data.projectId,
        userId: data.userId || null,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })
  }

  static async getFeedbackById(id: string) {
    return db.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            ownerId: true,
          }
        },
        analysis: true,
        implementation: true,
      }
    })
  }

  static async updateFeedback(id: string, data: FeedbackUpdate) {
    return db.feedback.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        analysis: true,
        implementation: true,
      }
    })
  }

  static async deleteFeedback(id: string) {
    return db.feedback.delete({
      where: { id }
    })
  }

  static async getFeedbackList(query: FeedbackQuery, userId?: string) {
    const where: any = {}
    
    if (query.projectId) {
      where.projectId = query.projectId
    } else if (userId) {
      where.OR = [
        { userId },
        { project: { ownerId: userId } }
      ]
    }
    
    if (query.status) {
      where.status = query.status
    }
    
    if (query.priority) {
      where.priority = query.priority
    }
    
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ]
    }
    
    const skip = (query.page - 1) * query.limit
    
    const [feedback, total] = await Promise.all([
      db.feedback.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            }
          },
          project: {
            select: {
              id: true,
              name: true,
            }
          },
          analysis: true,
          implementation: true,
        }
      }),
      db.feedback.count({ where })
    ])
    
    return {
      feedback,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit)
      }
    }
  }

  static async updateFeedbackStatus(id: string, status: string) {
    return db.feedback.update({
      where: { id },
      data: { status }
    })
  }

  static async getFeedbackForAnalysis() {
    return db.feedback.findMany({
      where: {
        status: 'PENDING',
        analysis: null
      },
      include: {
        project: true
      },
      take: 10 // Process in batches
    })
  }

  static async getFeedbackForImplementation() {
    return db.feedback.findMany({
      where: {
        status: 'ANALYZED',
        implementation: null,
        analysis: {
          isImplementable: true
        }
      },
      include: {
        project: true,
        analysis: true
      },
      take: 5 // Process fewer at a time for implementation
    })
  }
}
