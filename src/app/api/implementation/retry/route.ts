import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ImplementationOrchestrator } from '@/lib/services/implementation-orchestrator'
import { FeedbackService } from '@/lib/services/feedback-service'
import { AIServiceError } from '@/lib/ai/error-handling'
import { z } from 'zod'

const retryRequestSchema = z.object({
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
    const validatedData = retryRequestSchema.parse(body)
    
    // Check if feedback exists and user has permission
    const feedback = await FeedbackService.getFeedbackById(validatedData.feedbackId)
    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Only project owner can retry implementation
    if (feedback.project.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Retry implementation
    const result = await ImplementationOrchestrator.retryImplementation(
      validatedData.feedbackId,
      validatedData.accessToken
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        result,
        message: 'Implementation retry completed successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        result,
        message: 'Implementation retry failed'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error retrying implementation:', error)

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
