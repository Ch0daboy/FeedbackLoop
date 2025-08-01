import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FeedbackAnalysisService } from '@/lib/services/feedback-analysis-service'
import { AIServiceError } from '@/lib/ai/error-handling'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admins can trigger batch analysis for now
    // In a production app, you might want to check user role
    // For now, we'll allow any authenticated user to trigger batch analysis

    console.log(`User ${session.user.id} triggered batch feedback analysis`)

    // Trigger batch analysis
    const results = await FeedbackAnalysisService.analyzePendingFeedback()

    return NextResponse.json({
      success: true,
      analyzed: results.length,
      results: results.map(r => ({
        feedbackId: r.feedbackId,
        category: r.category,
        priority: r.priority,
        sentiment: r.sentiment,
        isImplementable: r.isImplementable
      })),
      message: `Successfully analyzed ${results.length} feedback items`
    })

  } catch (error) {
    console.error('Error in batch analysis:', error)

    if (error instanceof AIServiceError) {
      return NextResponse.json(
        { 
          error: 'AI service error', 
          message: error.message,
          service: error.service,
          retryable: error.retryable
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get analysis statistics
    const stats = await FeedbackAnalysisService.getAnalysisStats()

    return NextResponse.json({
      stats
    })

  } catch (error) {
    console.error('Error fetching analysis stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
