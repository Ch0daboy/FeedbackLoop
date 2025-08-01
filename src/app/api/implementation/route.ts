import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ImplementationOrchestrator } from '@/lib/services/implementation-orchestrator'
import { FeedbackService } from '@/lib/services/feedback-service'
import { AIServiceError } from '@/lib/ai/error-handling'
import { z } from 'zod'

const implementRequestSchema = z.object({
  feedbackId: z.string().cuid('Invalid feedback ID'),
  accessToken: z.string().min(1, 'GitHub access token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = implementRequestSchema.parse(body)
    
    // Check if feedback exists and user has permission
    const feedback = await FeedbackService.getFeedbackById(validatedData.feedbackId)
    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Only project owner can trigger implementation
    if (feedback.project.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if feedback is implementable
    if (!feedback.analysis?.isImplementable) {
      return NextResponse.json(
        { error: 'Feedback is not implementable' },
        { status: 400 }
      )
    }

    // Start implementation
    const result = await ImplementationOrchestrator.implementFeedback(
      validatedData.feedbackId,
      validatedData.accessToken
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        result,
        message: 'Implementation completed successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        result,
        message: 'Implementation failed'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error implementing feedback:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

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

    const { searchParams } = new URL(request.url)
    const feedbackId = searchParams.get('feedbackId')

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'feedbackId parameter is required' },
        { status: 400 }
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

    // Allow access for feedback author or project owner
    const hasAccess = 
      feedback.userId === session.user.id || 
      feedback.project.ownerId === session.user.id

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get implementation status
    const status = await ImplementationOrchestrator.getImplementationStatus(feedbackId)

    return NextResponse.json({
      feedbackId,
      status
    })

  } catch (error) {
    console.error('Error getting implementation status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
