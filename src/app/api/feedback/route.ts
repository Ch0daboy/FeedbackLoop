import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { feedbackSubmissionSchema, feedbackQuerySchema } from '@/lib/validations/feedback'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json()
    
    // Validate the request body
    const validatedData = feedbackSubmissionSchema.parse(body)
    
    // Check if project exists and user has access
    const project = await db.project.findUnique({
      where: { id: validatedData.projectId },
      include: { owner: true }
    })
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }
    
    // Create feedback entry
    const feedback = await db.feedback.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        email: validatedData.email,
        projectId: validatedData.projectId,
        userId: session?.user?.id || null,
        status: 'PENDING',
      },
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
        }
      }
    })
    
    // TODO: Trigger AI analysis in background
    // This will be implemented when we create the Gemini integration
    
    return NextResponse.json({
      success: true,
      feedback,
      message: 'Feedback submitted successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating feedback:', error)
    
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const query = feedbackQuerySchema.parse({
      projectId: searchParams.get('projectId'),
      status: searchParams.get('status'),
      priority: searchParams.get('priority'),
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      search: searchParams.get('search'),
    })
    
    // Build where clause
    const where: any = {}
    
    if (query.projectId) {
      // Check if user has access to this project
      const project = await db.project.findUnique({
        where: { id: query.projectId },
        select: { ownerId: true }
      })
      
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
      
      // Only project owner can see all feedback
      if (!session?.user?.id || project.ownerId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
      
      where.projectId = query.projectId
    } else if (session?.user?.id) {
      // If no specific project, show user's own feedback or projects they own
      where.OR = [
        { userId: session.user.id },
        { project: { ownerId: session.user.id } }
      ]
    } else {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (query.status) {
      where.status = query.status
    }
    
    if (query.priority) {
      where.priority = query.priority
    }
    
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ]
    }
    
    // Calculate pagination
    const skip = (query.page - 1) * query.limit
    
    // Get feedback with pagination
    const [feedback, total] = await Promise.all([
      db.feedback.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      db.feedback.count({ where })
    ])
    
    return NextResponse.json({
      feedback,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit)
      }
    })
    
  } catch (error) {
    console.error('Error fetching feedback:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
