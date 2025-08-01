import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { SuggestionImplementationService } from '@/lib/services/suggestion-implementation-service'
import { FeedbackService } from '@/lib/services/feedback-service'
import { AIServiceError } from '@/lib/ai/error-handling'
import { z } from 'zod'

const processRequestSchema = z.object({
  feedbackId: z.string().cuid('Invalid feedback ID'),
})

const batchProcessRequestSchema = z.object({
  feedbackIds: z.array(z.string().cuid('Invalid feedback ID')).min(1).max(10),
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
    
    // Check if this is a batch request
    if (body.feedbackIds && Array.isArray(body.feedbackIds)) {
      return handleBatchProcess(body, session.user.id)
    } else {
      return handleSingleProcess(body, session.user.id)
    }

  } catch (error) {
    console.error('Error processing suggestion:', error)

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

async function handleSingleProcess(body: any, userId: string) {
  const validatedData = processRequestSchema.parse(body)
  
  // Check if feedback exists and user has permission
  const feedback = await FeedbackService.getFeedbackById(validatedData.feedbackId)
  if (!feedback) {
    return NextResponse.json(
      { error: 'Feedback not found' },
      { status: 404 }
    )
  }

  // Only project owner can process suggestions
  if (feedback.project.ownerId !== userId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    )
  }

  // Process the suggestion
  const result = await SuggestionImplementationService.processUserSuggestion(validatedData.feedbackId)

  return NextResponse.json({
    success: true,
    result,
    message: `Suggestion processing ${result.status}`
  })
}

async function handleBatchProcess(body: any, userId: string) {
  const validatedData = batchProcessRequestSchema.parse(body)
  
  // Check permissions for all feedback items
  for (const feedbackId of validatedData.feedbackIds) {
    const feedback = await FeedbackService.getFeedbackById(feedbackId)
    if (!feedback) {
      return NextResponse.json(
        { error: `Feedback not found: ${feedbackId}` },
        { status: 404 }
      )
    }

    if (feedback.project.ownerId !== userId) {
      return NextResponse.json(
        { error: `Unauthorized for feedback: ${feedbackId}` },
        { status: 403 }
      )
    }
  }

  // Process all suggestions
  const results = await SuggestionImplementationService.batchProcessSuggestions(validatedData.feedbackIds)

  const summary = {
    total: results.length,
    completed: results.filter(r => r.status === 'completed').length,
    partial: results.filter(r => r.status === 'partial').length,
    failed: results.filter(r => r.status === 'failed').length
  }

  return NextResponse.json({
    success: true,
    results,
    summary,
    message: `Batch processing completed: ${summary.completed} completed, ${summary.partial} partial, ${summary.failed} failed`
  })
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

    // Get implementable suggestions
    const suggestions = await SuggestionImplementationService.getImplementablesuggestions()

    return NextResponse.json({
      suggestions,
      count: suggestions.length
    })

  } catch (error) {
    console.error('Error fetching implementable suggestions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
