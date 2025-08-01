import { db } from '@/lib/db'

export interface CreateProjectData {
  name: string
  description?: string
  githubRepo: string
  githubToken?: string
  ownerId: string
}

export interface UpdateProjectData {
  name?: string
  description?: string
  githubRepo?: string
  githubToken?: string
}

export class ProjectService {
  static async createProject(data: CreateProjectData) {
    return db.project.create({
      data: {
        name: data.name,
        description: data.description,
        githubRepo: data.githubRepo,
        githubToken: data.githubToken,
        ownerId: data.ownerId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        _count: {
          select: {
            feedback: true
          }
        }
      }
    })
  }

  static async getProjectById(id: string) {
    return db.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        feedback: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            },
            analysis: true,
            implementation: true,
          }
        },
        _count: {
          select: {
            feedback: true
          }
        }
      }
    })
  }

  static async updateProject(id: string, data: UpdateProjectData) {
    return db.project.update({
      where: { id },
      data,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        },
        _count: {
          select: {
            feedback: true
          }
        }
      }
    })
  }

  static async deleteProject(id: string) {
    return db.project.delete({
      where: { id }
    })
  }

  static async getUserProjects(userId: string) {
    return db.project.findMany({
      where: { ownerId: userId },
      include: {
        _count: {
          select: {
            feedback: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async getProjectStats(projectId: string) {
    const [
      totalFeedback,
      pendingFeedback,
      analyzedFeedback,
      implementedFeedback,
      feedbackByPriority
    ] = await Promise.all([
      db.feedback.count({
        where: { projectId }
      }),
      db.feedback.count({
        where: { projectId, status: 'PENDING' }
      }),
      db.feedback.count({
        where: { projectId, status: 'ANALYZED' }
      }),
      db.feedback.count({
        where: { projectId, status: 'IMPLEMENTED' }
      }),
      db.feedback.groupBy({
        by: ['priority'],
        where: { projectId },
        _count: true
      })
    ])

    return {
      totalFeedback,
      pendingFeedback,
      analyzedFeedback,
      implementedFeedback,
      feedbackByPriority: feedbackByPriority.reduce((acc, item) => {
        if (item.priority) {
          acc[item.priority] = item._count
        }
        return acc
      }, {} as Record<string, number>)
    }
  }

  static async checkProjectAccess(projectId: string, userId: string) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true }
    })
    
    return project?.ownerId === userId
  }
}
