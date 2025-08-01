import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SuggestionImplementationService } from '@/lib/services/suggestion-implementation-service'
import { FeedbackService } from '@/lib/services/feedback-service'
import { z } from 'zod'

const validateRequestSchema = z.object({
  feedbackId: z.string().cuid('Invalid feedback ID'),
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
    const validatedData = validateRequestSchema.parse(body)
    
    // Check if feedback exists and user has permission
    const feedback = await FeedbackService.getFeedbackById(validatedData.feedbackId)
    if (!feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }

    // Allow validation for feedback author or project owner
    const hasAccess = 
      feedback.userId === session.user.id || 
      feedback.project.ownerId === session.user.id

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Validate the suggestion
    const validation = await SuggestionImplementationService.validateSuggestion(validatedData.feedbackId)

    return NextResponse.json({
      success: true,
      validation,
      feedbackId: validatedData.feedbackId
    })

  } catch (error) {
    console.error('Error validating suggestion:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
