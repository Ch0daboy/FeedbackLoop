import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get comprehensive dashboard statistics
    const [
      totalFeedback,
      pendingAnalysis,
      analyzedFeedback,
      implementedCount,
      projectCount,
      recentActivity
    ] = await Promise.all([
      // Total feedback count
      db.feedback.count({
        where: {
          OR: [
            { userId: session.user.id },
            { project: { ownerId: session.user.id } }
          ]
        }
      }),

      // Pending analysis count
      db.feedback.count({
        where: {
          status: 'PENDING',
          OR: [
            { userId: session.user.id },
            { project: { ownerId: session.user.id } }
          ]
        }
      }),

      // Analyzed feedback count
      db.feedback.count({
        where: {
          status: 'ANALYZED',
          OR: [
            { userId: session.user.id },
            { project: { ownerId: session.user.id } }
          ]
        }
      }),

      // Implemented feedback count
      db.feedback.count({
        where: {
          status: 'IMPLEMENTED',
          OR: [
            { userId: session.user.id },
            { project: { ownerId: session.user.id } }
          ]
        }
      }),

      // User's project count
      db.project.count({
        where: { ownerId: session.user.id }
      }),

      // Recent activity (last 7 days)
      db.feedback.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          },
          OR: [
            { userId: session.user.id },
            { project: { ownerId: session.user.id } }
          ]
        }
      })
    ])

    // Calculate additional metrics
    const analysisRate = totalFeedback > 0 ? ((totalFeedback - pendingAnalysis) / totalFeedback) * 100 : 0
    const implementationRate = totalFeedback > 0 ? (implementedCount / totalFeedback) * 100 : 0

    // Get feedback by status breakdown
    const statusBreakdown = await db.feedback.groupBy({
      by: ['status'],
      where: {
        OR: [
          { userId: session.user.id },
          { project: { ownerId: session.user.id } }
        ]
      },
      _count: true
    })

    // Get feedback by priority breakdown
    const priorityBreakdown = await db.feedback.groupBy({
      by: ['priority'],
      where: {
        priority: { not: null },
        OR: [
          { userId: session.user.id },
          { project: { ownerId: session.user.id } }
        ]
      },
      _count: true
    })

    const stats = {
      totalFeedback,
      pendingAnalysis,
      analyzedFeedback,
      implementedCount,
      projectCount,
      recentActivity,
      analysisRate: Math.round(analysisRate),
      implementationRate: Math.round(implementationRate),
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = item._count
        return acc
      }, {} as Record<string, number>),
      priorityBreakdown: priorityBreakdown.reduce((acc, item) => {
        if (item.priority) {
          acc[item.priority] = item._count
        }
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      stats,
      message: 'Dashboard statistics retrieved successfully'
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
