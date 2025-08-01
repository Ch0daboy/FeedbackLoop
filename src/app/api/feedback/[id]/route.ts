import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { feedbackUpdateSchema } from '@/lib/validations/feedback'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    const feedbackId = params.id
    
    // Get feedback with all related data
    const feedback = await db.feedback.findUnique({
      where: { id: feedbackId },
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
    
    return NextResponse.json({ feedback })
    
  } catch (error) {
    console.error('Error fetching feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    
    const body = await request.json()
    const validatedData = feedbackUpdateSchema.parse(body)
    
    // Check if feedback exists and user has permission to update
    const existingFeedback = await db.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        project: {
          select: {
            ownerId: true,
          }
        }
      }
    })
    
    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }
    
    // Only feedback author or project owner can update
    const canUpdate = 
      existingFeedback.userId === session.user.id ||
      existingFeedback.project.ownerId === session.user.id
    
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Update feedback
    const updatedFeedback = await db.feedback.update({
      where: { id: feedbackId },
      data: validatedData,
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
    
    return NextResponse.json({
      success: true,
      feedback: updatedFeedback,
      message: 'Feedback updated successfully'
    })
    
  } catch (error) {
    console.error('Error updating feedback:', error)
    
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

export async function DELETE(
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
    
    // Check if feedback exists and user has permission to delete
    const existingFeedback = await db.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        project: {
          select: {
            ownerId: true,
          }
        }
      }
    })
    
    if (!existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      )
    }
    
    // Only project owner can delete feedback
    if (existingFeedback.project.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    // Delete feedback (cascade will handle related records)
    await db.feedback.delete({
      where: { id: feedbackId }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting feedback:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
