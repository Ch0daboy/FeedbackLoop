import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FeedbackAnalysisService } from '@/lib/services/feedback-analysis-service'
import { FeedbackService } from '@/lib/services/feedback-service'
import { AIServiceError } from '@/lib/ai/error-handling'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    const feedbackId = params.id

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if feedback exists and user has permission
    const feedback = await FeedbackService.getFeedbackById(feedbackId)
    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Only project owner can trigger analysis
    if (feedback.project.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if already being analyzed
    if (feedback.status === 'ANALYZING') {
      return NextResponse.json(
        { error: 'Feedback is already being analyzed' },
        { status: 409 }
      )
    }

    // Trigger analysis
    const result = await FeedbackAnalysisService.analyzeFeedback(feedbackId)

    return NextResponse.json({
      success: true,
      analysis: result,
      message: 'Feedback analysis completed successfully'
    })

  } catch (error) {
    console.error('Error analyzing feedback:', error)

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

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    const feedbackId = params.id

    // Get feedback with analysis
    const feedback = await FeedbackService.getFeedbackById(feedbackId)
    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Check access permissions
    const hasAccess = 
      !session?.user?.id || // Anonymous access for public feedback
      feedback.userId === session.user.id || // User's own feedback
      feedback.project.ownerId === session.user.id // Project owner

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (!feedback.analysis) {
      return NextResponse.json(
        { error: 'Feedback has not been analyzed yet' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      analysis: {
        id: feedback.analysis.id,
        category: feedback.analysis.extractedCategory,
        priority: feedback.analysis.extractedPriority,
        sentiment: feedback.analysis.extractedSentiment,
        isImplementable: feedback.analysis.isImplementable,
        implementationSuggestion: feedback.analysis.implementationSuggestion,
        createdAt: feedback.analysis.createdAt,
      }
    })

  } catch (error) {
    console.error('Error fetching feedback analysis:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
