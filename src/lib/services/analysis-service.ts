import { db } from '@/lib/db'

export interface CreateAnalysisData {
  feedbackId: string
  geminiResponse: string
  extractedCategory?: string
  extractedPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  extractedSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  isImplementable: boolean
  implementationSuggestion?: string
}

export interface UpdateAnalysisData {
  extractedCategory?: string
  extractedPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  extractedSentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
  isImplementable?: boolean
  implementationSuggestion?: string
}

export class AnalysisService {
  static async createAnalysis(data: CreateAnalysisData) {
    // Create analysis record
    const analysis = await db.feedbackAnalysis.create({
      data: {
        feedbackId: data.feedbackId,
        geminiResponse: data.geminiResponse,
        extractedCategory: data.extractedCategory,
        extractedPriority: data.extractedPriority,
        extractedSentiment: data.extractedSentiment,
        isImplementable: data.isImplementable,
        implementationSuggestion: data.implementationSuggestion,
      },
      include: {
        feedback: {
          include: {
            project: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    })

    // Update feedback with extracted data
    await db.feedback.update({
      where: { id: data.feedbackId },
      data: {
        category: data.extractedCategory,
        priority: data.extractedPriority,
        sentiment: data.extractedSentiment,
        status: 'ANALYZED',
      }
    })

    return analysis
  }

  static async getAnalysisById(id: string) {
    return db.feedbackAnalysis.findUnique({
      where: { id },
      include: {
        feedback: {
          include: {
            project: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    })
  }

  static async getAnalysisByFeedbackId(feedbackId: string) {
    return db.feedbackAnalysis.findUnique({
      where: { feedbackId },
      include: {
        feedback: {
          include: {
            project: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      }
    })
  }

  static async updateAnalysis(id: string, data: UpdateAnalysisData) {
    const analysis = await db.feedbackAnalysis.update({
      where: { id },
      data,
      include: {
        feedback: true
      }
    })

    // Update feedback with new extracted data
    await db.feedback.update({
      where: { id: analysis.feedbackId },
      data: {
        category: data.extractedCategory || analysis.extractedCategory,
        priority: data.extractedPriority || analysis.extractedPriority,
        sentiment: data.extractedSentiment || analysis.extractedSentiment,
      }
    })

    return analysis
  }

  static async deleteAnalysis(id: string) {
    return db.feedbackAnalysis.delete({
      where: { id }
    })
  }

  static async getImplementableFeedback() {
    return db.feedbackAnalysis.findMany({
      where: {
        isImplementable: true,
        feedback: {
          status: 'ANALYZED',
          implementation: null
        }
      },
      include: {
        feedback: {
          include: {
            project: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        feedback: {
          createdAt: 'desc'
        }
      },
      take: 10
    })
  }

  static async getAnalysisStats() {
    const [
      totalAnalyzed,
      implementableCount,
      sentimentStats,
      priorityStats,
      categoryStats
    ] = await Promise.all([
      db.feedbackAnalysis.count(),
      db.feedbackAnalysis.count({
        where: { isImplementable: true }
      }

export interface CreateImplementationData {
  feedbackId: string
  githubBranch: string
  claudeResponse: string
  generatedCode: string
  status?: 'PENDING' | 'GENERATING_CODE' | 'CREATING_BRANCH' | 'COMMITTING_CODE' | 'CREATING_PR' | 'COMPLETED' | 'FAILED'
  githubPrUrl?: string
  errorMessage?: string
}

export interface UpdateImplementationData {
  status?: 'PENDING' | 'GENERATING_CODE' | 'CREATING_BRANCH' | 'COMMITTING_CODE' | 'CREATING_PR' | 'COMPLETED' | 'FAILED'
  githubPrUrl?: string
  errorMessage?: string
  generatedCode?: string
}

export class ImplementationService {
  static async createImplementation(data: CreateImplementationData) {
    const implementation = await db.implementation.create({
      data: {
        feedbackId: data.feedbackId,
        githubBranch: data.githubBranch,
        claudeResponse: data.claudeResponse,
        generatedCode: data.generatedCode,
        status: data.status || 'PENDING',
        githubPrUrl: data.githubPrUrl,
        errorMessage: data.errorMessage,
      },
      include: {
        feedback: {
          include: {
            project: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            analysis: true,
          }
        }
      }
    })

    // Update feedback status
    await db.feedback.update({
      where: { id: data.feedbackId },
      data: {
        status: data.status === 'COMPLETED' ? 'IMPLEMENTED' : 'IMPLEMENTING',
      }
    })

    return implementation
  }

  static async getImplementationById(id: string) {
    return db.implementation.findUnique({
      where: { id },
      include: {
        feedback: {
          include: {
            project: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            analysis: true,
          }
        }
      }
    })
  }

  static async getImplementationByFeedbackId(feedbackId: string) {
    return db.implementation.findUnique({
      where: { feedbackId },
      include: {
        feedback: {
          include: {
            project: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            },
            analysis: true,
          }
        }
      }
    })
  }

  static async updateImplementation(id: string, data: UpdateImplementationData) {
    const implementation = await db.implementation.update({
      where: { id },
      data,
      include: {
        feedback: true
      }
    })

    // Update feedback status based on implementation status
    let feedbackStatus = 'IMPLEMENTING'
    if (data.status === 'COMPLETED') {
      feedbackStatus = 'IMPLEMENTED'
    } else if (data.status === 'FAILED') {
      feedbackStatus = 'ANALYZED' // Reset to analyzed so it can be retried
    }

    await db.feedback.update({
      where: { id: implementation.feedbackId },
      data: { status: feedbackStatus }
    })

    return implementation
  }

  static async deleteImplementation(id: string) {
    return db.implementation.delete({
      where: { id }
    })
  }

  static async getPendingImplementations() {
    return db.implementation.findMany({
      where: {
        status: {
          in: ['PENDING', 'GENERATING_CODE', 'CREATING_BRANCH', 'COMMITTING_CODE', 'CREATING_PR']
        }
      },
      include: {
        feedback: {
          include: {
            project: true,
            analysis: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 5
    })
  }

  static async getImplementationStats() {
    const [
      totalImplementations,
      completedCount,
      failedCount,
      pendingCount,
      statusStats
    ] = await Promise.all([
      db.implementation.count(),
      db.implementation.count({
        where: { status: 'COMPLETED' }
      }),
      db.implementation.count({
        where: { status: 'FAILED' }
      }),
      db.implementation.count({
        where: {
          status: {
            in: ['PENDING', 'GENERATING_CODE', 'CREATING_BRANCH', 'COMMITTING_CODE', 'CREATING_PR']
          }
        }
      }),
      db.implementation.groupBy({
        by: ['status'],
        _count: true
      })
    ])

    return {
      totalImplementations,
      completedCount,
      failedCount,
      pendingCount,
      successRate: totalImplementations > 0 ? (completedCount / totalImplementations) * 100 : 0,
      statusStats: statusStats.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>)
    }
  }
}),
      db.feedbackAnalysis.groupBy({
        by: ['extractedSentiment'],
        _count: true
      }),
      db.feedbackAnalysis.groupBy({
        by: ['extractedPriority'],
        _count: true
      }),
      db.feedbackAnalysis.groupBy({
        by: ['extractedCategory'],
        _count: true
      })
    ])

    return {
      totalAnalyzed,
      implementableCount,
      implementablePercentage: totalAnalyzed > 0 ? (implementableCount / totalAnalyzed) * 100 : 0,
      sentimentStats: sentimentStats.reduce((acc, item) => {
        if (item.extractedSentiment) {
          acc[item.extractedSentiment] = item._count
        }
        return acc
      }, {} as Record<string, number>),
      priorityStats: priorityStats.reduce((acc, item) => {
        if (item.extractedPriority) {
          acc[item.extractedPriority] = item._count
        }
        return acc
      }, {} as Record<string, number>),
      categoryStats: categoryStats.reduce((acc, item) => {
        if (item.extractedCategory) {
          acc[item.extractedCategory] = item._count
        }
        return acc
      }, {} as Record<string, number>)
    }
  }
}
